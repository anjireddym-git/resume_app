import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  limit
} from 'firebase/firestore';
import { db, storage, storageRef, uploadBytes, getBlob, deleteObject } from '../lib/firebase';
import { DEFAULT_THEME_CONFIG } from '../config/themeConfig';
import { DEFAULT_SECTION_ORDER } from '../config/templates';
import { DEFAULT_LAYOUT_CONFIG, normalizeLayoutConfig } from '../config/layoutSchema';
import { normalizeSummaryToPoints } from '../lib/summaryUtils';

const DEFAULT_SECTION_FORMATS = {
  summary: 'points',
  skills: 'grouped',
  experience: 'detailed',
  education: 'detailed',
  projects: 'detailed',
  certifications: 'inline',
  internships: 'detailed',
  hackathons: 'detailed',
  header: 'centered',
};

const normalizeSectionFormats = (sectionFormats = {}) => ({
  ...DEFAULT_SECTION_FORMATS,
  ...(sectionFormats || {}),
  summary: 'points',
});

// ============================================================================
// DOCX STORAGE (new DOCX-native pipeline)
// ============================================================================

/**
 * Upload a DOCX blob to Firebase Storage at resumes/{userId}/{resumeId}.docx.
 * Returns the storage path string.
 */
export const uploadResumeDocx = async (userId, resumeId, blob) => {
  const path = `resumes/${userId}/${resumeId}.docx`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob, {
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  return path;
};

/**
 * Download a DOCX blob from Firebase Storage.
 */
export const downloadResumeDocx = async (path) => {
  const ref = storageRef(storage, path);
  return await getBlob(ref);
};

/**
 * Upload a versioned snapshot of a DOCX (used for version history).
 */
export const uploadVersionSnapshotDocx = async (userId, resumeId, versionId, blob) => {
  const path = `resumes/${userId}/${resumeId}/v${versionId}.docx`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob, {
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  return path;
};

/**
 * Best-effort delete of a stored DOCX. Swallows not-found errors so callers
 * can safely call this during cleanup flows.
 */
export const deleteResumeDocx = async (path) => {
  try {
    const ref = storageRef(storage, path);
    await deleteObject(ref);
  } catch (e) {
    if (e?.code !== 'storage/object-not-found') {
      console.warn('deleteResumeDocx:', e?.message || e);
    }
  }
};

/**
 * Create a new DOCX-backed resume. Uploads the blob to Storage first, then
 * writes a Firestore record carrying the field map and storage path.
 *
 * @param {string} userId
 * @param {string} groupId
 * @param {{
 *   name: string,
 *   blob: Blob,
 *   fieldMap: { sections: Array, fields: Object },
 *   extractedText?: string,
 *   jobDescription?: string,
 * }} payload
 * @returns {Promise<string>} new resume document ID
 */
export const createDocxResume = async (userId, groupId, payload) => {
  const group = await getResumeGroup(groupId);
  const version = (group.resumeCount || 0) + 1;

  // Pre-create Firestore doc so we have an ID for the Storage path.
  const docRef = await addDoc(collection(db, 'resumes'), {
    userId,
    groupId,
    name: payload.name || `Resume v${version}`,
    version,
    docxStoragePath: '',
    parentResumeId: payload.parentResumeId || null,
    rootResumeId: payload.rootResumeId || null,
    generationType: payload.generationType || null,
    generationMeta: sanitizeForFirebase(payload.generationMeta || null),
    starred: !!payload.starred,
    starredAt: payload.starred ? serverTimestamp() : null,
    childCount: 0,
    sections: payload.fieldMap?.sections || [],
    fields: payload.fieldMap?.fields || {},
    extractedText: payload.extractedText || '',
    jobDescription: payload.jobDescription || '',
    matchScore: null,
    matchAnalysis: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const path = await uploadResumeDocx(userId, docRef.id, payload.blob);
  await updateDoc(docRef, {
    docxStoragePath: path,
    rootResumeId: payload.rootResumeId || docRef.id,
    updatedAt: serverTimestamp(),
  });

  if (payload.parentResumeId) {
    await updateDoc(doc(db, 'resumes', payload.parentResumeId), {
      childCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }

  // Bump group count.
  await updateDoc(doc(db, 'resumeGroups', groupId), {
    resumeCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Persist updated field map and re-uploaded DOCX blob for an existing resume.
 */
export const saveDocxResume = async (userId, resumeId, blob, fieldMap, extractedText) => {
  await uploadResumeDocx(userId, resumeId, blob);
  await updateDoc(doc(db, 'resumes', resumeId), {
    sections: fieldMap?.sections || [],
    fields: fieldMap?.fields || {},
    extractedText: extractedText || '',
    updatedAt: serverTimestamp(),
  });
};

// ============================================================================
// LEGACY APIs below — preserved for backwards compatibility but no longer
// invoked from the new DOCX-native UI. Theme / template / layoutConfig /
// section-format paths are deprecated.
// ============================================================================

// ============ RESUME GROUPS ============

export const createResumeGroup = async (userId, groupData) => {
  const groupRef = await addDoc(collection(db, 'resumeGroups'), {
    userId,
    name: groupData.name,
    sharedData: {
      personalInfo: groupData.personalInfo || {},
      experience: groupData.experience || [],
      education: groupData.education || [],
    },
    themeConfig: groupData.themeConfig || DEFAULT_THEME_CONFIG,
    sectionOrder: groupData.sectionOrder || DEFAULT_SECTION_ORDER,
    visibleSections: groupData.visibleSections || DEFAULT_SECTION_ORDER,
    // Layout-preservation fields (Phase 1)
    layoutSource: groupData.layoutSource || 'template', // 'template' | 'uploaded'
    layoutConfig: groupData.layoutConfig ? normalizeLayoutConfig(groupData.layoutConfig) : DEFAULT_LAYOUT_CONFIG,
    customSectionDefs: groupData.customSectionDefs || [], // [{ id, title }]
    resumeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  
  return groupRef.id;
};

export const getResumeGroups = async (userId) => {
  const q = query(
    collection(db, 'resumeGroups'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getResumeGroup = async (groupId) => {
  const docRef = doc(db, 'resumeGroups', groupId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Group not found');
  }
  
  return { id: docSnap.id, ...docSnap.data() };
};

export const updateResumeGroup = async (groupId, data) => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const updateGroupSharedData = async (groupId, sharedData) => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    sharedData,
    updatedAt: serverTimestamp(),
  });
};

export const updateGroupTheme = async (groupId, themeConfig) => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    themeConfig,
    updatedAt: serverTimestamp(),
  });
};

export const updateGroupSectionLayout = async (groupId, sectionOrder, visibleSections) => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    sectionOrder,
    visibleSections,
    updatedAt: serverTimestamp(),
  });
};

// ============ LAYOUT-PRESERVATION (Phase 1) ============

// Persist the uploaded-resume layout config on the group. Pass
// `layoutSource: 'uploaded' | 'template'` to switch render mode.
export const saveLayoutConfig = async (groupId, layoutConfig, layoutSource = 'uploaded') => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    layoutConfig: normalizeLayoutConfig(layoutConfig),
    layoutSource,
    updatedAt: serverTimestamp(),
  });
};

// Switch a group between template-mode and uploaded-layout-mode without
// clobbering the saved layoutConfig.
export const setLayoutSource = async (groupId, layoutSource) => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    layoutSource,
    updatedAt: serverTimestamp(),
  });
};

// Update the definitions of custom (user-named) sections on the group.
// `customSectionDefs` is an array of `{ id, title }`.
export const updateCustomSectionDefs = async (groupId, customSectionDefs) => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    customSectionDefs: customSectionDefs || [],
    updatedAt: serverTimestamp(),
  });
};

export const deleteResumeGroup = async (groupId) => {
  // Get group to get userId
  const group = await getResumeGroup(groupId);
  
  // First delete all resumes in the group
  const resumes = await getResumesInGroup(groupId, group.userId);
  for (const resume of resumes) {
    await deleteDoc(doc(db, 'resumes', resume.id));
  }
  
  // Then delete the group
  await deleteDoc(doc(db, 'resumeGroups', groupId));
};

// ============ RESUMES ============

export const createResume = async (userId, groupId, resumeData) => {
  // Get current resume count for versioning
  const group = await getResumeGroup(groupId);
  const version = (group.resumeCount || 0) + 1;

  const resumeRef = doc(collection(db, 'resumes'));
  await setDoc(resumeRef, {
    userId,
    groupId,
    name: resumeData.name || `Resume v${version}`,
    version,
    parentResumeId: resumeData.parentResumeId || null,
    rootResumeId: resumeData.rootResumeId || resumeRef.id,
    generationType: resumeData.generationType || null,
    generationMeta: sanitizeForFirebase(resumeData.generationMeta || null),
    starred: !!resumeData.starred,
    starredAt: resumeData.starred ? serverTimestamp() : null,
    childCount: resumeData.childCount || 0,
    jobDescription: resumeData.jobDescription || '',
    customData: {
      summary: normalizeSummaryToPoints(resumeData.summary || ''),
      experience: resumeData.experience || [], // Highlights, environment per job
      skills: resumeData.skills || {},
      projects: resumeData.projects || [],
      certifications: resumeData.certifications || [],
      internships: resumeData.internships || [],
      hackathons: resumeData.hackathons || [],
      customSections: resumeData.customSections || {},
    },
    // Section format settings
    sectionFormats: normalizeSectionFormats(resumeData.sectionFormats),
    matchScore: null,
    matchAnalysis: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (resumeData.parentResumeId) {
    await updateDoc(doc(db, 'resumes', resumeData.parentResumeId), {
      childCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }

  
  // Update group resume count
  await updateDoc(doc(db, 'resumeGroups', groupId), {
    resumeCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  
  return resumeRef.id;
};

export const createGeneratedResume = async (
  userId,
  sourceResume,
  generatedResumeData,
  options = {}
) => {
  if (!sourceResume?.id) throw new Error('Source resume is required');
  const mode = options.mode === 'transform' ? 'transform' : 'optimize';

  return createResume(userId, sourceResume.groupId, {
    name: options.name || buildGeneratedResumeName(sourceResume.name, mode),
    summary: generatedResumeData.summary || '',
    experience: generatedResumeData.experience || [],
    skills: generatedResumeData.skills || {},
    projects: generatedResumeData.projects || [],
    certifications: generatedResumeData.certifications || [],
    internships: generatedResumeData.internships || [],
    hackathons: generatedResumeData.hackathons || [],
    sectionFormats: sourceResume.sectionFormats,
    jobDescription: options.jobDescription || '',
    parentResumeId: sourceResume.id,
    rootResumeId: sourceResume.rootResumeId || sourceResume.id,
    generationType: mode,
    generationMeta: {
      sourceResumeId: sourceResume.id,
      sourceResumeName: sourceResume.name || 'Resume',
      fieldsUpdated: options.fieldsToUpdate || [],
      jobDescription: options.jobDescription || '',
      label: options.label || null,
      createdAt: new Date().toISOString(),
    },
    ...(options.aiTrace ? { aiTrace: options.aiTrace } : {}),
    ...(options.aiMetadata ? { aiMetadata: options.aiMetadata } : {}),
  });
};

export const toggleResumeStar = async (resumeId, starred) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    starred: !!starred,
    starredAt: starred ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
};

export const getResumesInGroup = async (groupId, userId) => {
  const q = query(
    collection(db, 'resumes'),
    where('groupId', '==', groupId),
    where('userId', '==', userId),
    orderBy('version', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetch every resume the user owns across all groups. Used by the
 * Tailor-and-Send picker, which lets the AI choose the best base resume
 * from the user's entire library.
 */
export const getAllResumesForUser = async (userId) => {
  const q = query(
    collection(db, 'resumes'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getResume = async (resumeId) => {
  const docRef = doc(db, 'resumes', resumeId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Resume not found');
  }
  
  return { id: docSnap.id, ...docSnap.data() };
};

export const updateResume = async (resumeId, data) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Update Google Drive sync metadata on a resume.
 * Stores: driveFileId, driveFolderId, lastSyncedAt, driveWebViewLink.
 */
export const updateResumeDriveSync = async (resumeId, { driveFileId, driveFolderId, driveWebViewLink }) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  const payload = {
    driveFileId: driveFileId || null,
    driveFolderId: driveFolderId || null,
    driveWebViewLink: driveWebViewLink || null,
    driveLastSyncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(resumeRef, payload);
};

/**
 * Cache the Drive folder id on a resume group so we don't search every sync.
 */
export const updateGroupDriveFolder = async (groupId, { driveFolderId, driveRootId }) => {
  const groupRef = doc(db, 'resumeGroups', groupId);
  await updateDoc(groupRef, {
    driveFolderId: driveFolderId || null,
    driveRootId: driveRootId || null,
    updatedAt: serverTimestamp(),
  });
};

export const updateResumeCustomData = async (resumeId, customData) => {
  console.log('[resumeService] updateResumeCustomData called', { resumeId });
  console.log('[resumeService] Raw customData:', JSON.stringify(customData, null, 2));

  const normalizedData = {
    ...(customData || {}),
    summary: normalizeSummaryToPoints(customData?.summary || ''),
  };
  const sanitized = sanitizeForFirebase(normalizedData);
  console.log('[resumeService] Sanitized data:', JSON.stringify(sanitized, null, 2));
  
  const resumeRef = doc(db, 'resumes', resumeId);
  try {
    await updateDoc(resumeRef, {
      customData: sanitized,
      updatedAt: serverTimestamp(),
    });
    console.log('[resumeService] updateResumeCustomData SUCCESS');
  } catch (err) {
    console.error('[resumeService] updateResumeCustomData FAILED:', err);
    throw err;
  }
};

export const updateResumeSectionFormats = async (resumeId, sectionFormats) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    sectionFormats: normalizeSectionFormats(sectionFormats),
    updatedAt: serverTimestamp(),
  });
};

export const updateResumeSectionFormat = async (resumeId, sectionId, formatId) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    [`sectionFormats.${sectionId}`]: sectionId === 'summary' ? 'points' : formatId,
    updatedAt: serverTimestamp(),
  });
};

export const updateResumeMatchAnalysis = async (resumeId, matchScore, matchAnalysis) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    matchScore,
    matchAnalysis,
    updatedAt: serverTimestamp(),
  });
};

export const deleteResume = async (resumeId, groupId) => {
  const existingResume = await getResume(resumeId);
  await deleteDoc(doc(db, 'resumes', resumeId));

  if (existingResume.parentResumeId) {
    await updateDoc(doc(db, 'resumes', existingResume.parentResumeId), {
      childCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  }
  
  // Decrement group resume count
  await updateDoc(doc(db, 'resumeGroups', groupId), {
    resumeCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
};

function buildGeneratedResumeName(sourceName, mode) {
  const suffix = mode === 'transform' ? 'Transform' : 'Optimized';
  const base = sourceName || 'Resume';
  return `${base} - ${suffix}`;
}

// ============ VERSION SNAPSHOTS ============

// Create a version snapshot before AI updates
export const createVersionSnapshot = async (resumeId, customData, metadata = {}) => {
  console.log('[resumeService] createVersionSnapshot called', { resumeId, metadata });
  console.log('[resumeService] Snapshot raw data:', JSON.stringify(customData, null, 2));
  
  const sanitized = sanitizeForFirebase(customData);
  console.log('[resumeService] Snapshot sanitized data:', JSON.stringify(sanitized, null, 2));
  
  try {
    const snapshotRef = await addDoc(collection(db, 'resumes', resumeId, 'versions'), {
      customData: sanitized,
      jobDescription: metadata.jobDescription || '',
      fieldsUpdated: metadata.fieldsUpdated || [],
      label: metadata.label || 'Before AI update',
      createdAt: serverTimestamp(),
    });
    console.log('[resumeService] createVersionSnapshot SUCCESS, id:', snapshotRef.id);
    return snapshotRef.id;
  } catch (err) {
    console.error('[resumeService] createVersionSnapshot FAILED:', err);
    throw err;
  }
};

// Get all version snapshots for a resume
export const getVersionSnapshots = async (resumeId) => {
  const q = query(
    collection(db, 'resumes', resumeId, 'versions'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date()
  }));
};

// Get a specific version snapshot
export const getVersionSnapshot = async (resumeId, versionId) => {
  const docRef = doc(db, 'resumes', resumeId, 'versions', versionId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Version not found');
  }
  
  return { id: docSnap.id, ...docSnap.data() };
};

// Restore a resume to a previous version
export const restoreVersion = async (resumeId, versionId) => {
  // Get the version data
  const version = await getVersionSnapshot(resumeId, versionId);
  
  // Update the resume with the version's customData
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    customData: version.customData,
    updatedAt: serverTimestamp(),
    // Clear match analysis since content changed
    matchScore: null,
    matchAnalysis: null,
  });
  
  return version.customData;
};

// Delete a version snapshot
export const deleteVersionSnapshot = async (resumeId, versionId) => {
  await deleteDoc(doc(db, 'resumes', resumeId, 'versions', versionId));
};

// ============ HELPERS ============

/**
 * Recursively removes undefined values from an object for Firebase compatibility.
 * Firebase doesn't accept undefined values, so we convert them to null or remove them.
 */
const sanitizeForFirebase = (obj) => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined) // Remove undefined items from arrays
      .map(item => sanitizeForFirebase(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Skip undefined values entirely
      continue;
    }
    sanitized[key] = sanitizeForFirebase(value);
  }
  return sanitized;
};

// Merge shared data with custom data to create full resume
export const buildFullResume = (group, resume) => {
  const shared = group.sharedData || {};
  const custom = resume.customData || {};
  
  // Merge experience: shared has company/dates, custom has highlights
  const mergedExperience = (shared.experience || []).map((sharedExp, index) => ({
    ...sharedExp,
    ...(custom.experience?.[index] || {}),
  }));
  
  // Merge personalInfo: custom overrides shared (resume-level overrides group-level)
  const mergedPersonalInfo = {
    ...(shared.personalInfo || {}),
    ...(custom.personalInfo || {}),
  };
  
  // Default section formats
  const normalizedSummary = normalizeSummaryToPoints(custom.summary || '');
  
  return {
    personalInfo: mergedPersonalInfo,
    summary: normalizedSummary,
    experience: mergedExperience,
    education: custom.education?.length ? custom.education : (shared.education || []),
    skills: custom.skills || {},
    projects: custom.projects || [],
    certifications: custom.certifications || [],
    internships: custom.internships || [],
    hackathons: custom.hackathons || [],
    // Custom sections (Phase 1) - freeform markdown blocks keyed by section id.
    // Defs (id + title) live on the group; content lives on the resume.
    customSections: custom.customSections || {},
    customSectionDefs: group.customSectionDefs || [],
    sectionFormats: normalizeSectionFormats(resume.sectionFormats),
    themeConfig: group.themeConfig || DEFAULT_THEME_CONFIG,
    // Layout-preservation (Phase 1)
    layoutSource: group.layoutSource || 'template',
    layoutConfig: group.layoutConfig || null,
  };
};

// ============================================================================
// SENT APPLICATIONS / FOLLOW-UPS (Tailor-and-Send flow)
// ============================================================================

// Compute follow-up interval in ms from {intervalUnit, intervalValue}, with
// fallback to legacy intervalDays.
export const computeFollowUpIntervalMs = (followUp) => {
  if (!followUp) return 7 * 24 * 60 * 60 * 1000;
  const unit = followUp.intervalUnit;
  const value = Number(followUp.intervalValue);
  if (unit && value > 0) {
    if (unit === 'minutes') return value * 60 * 1000;
    if (unit === 'hours')   return value * 60 * 60 * 1000;
    if (unit === 'days')    return value * 24 * 60 * 60 * 1000;
  }
  const days = Number(followUp.intervalDays) || 7;
  return days * 24 * 60 * 60 * 1000;
};

/**
 * Record a sent recruiter outreach email so we can show history, attach
 * replies tracked via Gmail watch, and schedule follow-ups.
 *
 * @returns {Promise<string>} new sentApplications document ID
 */
export const logSentApplication = async ({
  userId,
  resumeId,
  groupId = null,
  jobDescription = '',
  recipientEmail,
  recipientName = null,
  cc = [],
  bcc = [],
  subject,
  body,
  gmailMessageId,
  gmailThreadId,
  gmailMessageIdHeader = null,
  baseResumeId = null,
  followUp = null,
  matchAnalysis = null,
}) => {
  const docRef = await addDoc(collection(db, 'sentApplications'), {
    userId,
    resumeId,
    baseResumeId,
    groupId,
    jobDescription,
    recipientEmail,
    recipientName,
    cc,
    bcc,
    subject,
    body,
    gmailMessageId,
    gmailThreadId,
    gmailMessageIdHeader,
    matchAnalysis,
    replyCount: 0,
    lastReplyAt: null,
    followUp: followUp
      ? {
          enabled: !!followUp.enabled,
          intervalDays: followUp.intervalDays || 7,
          intervalUnit: followUp.intervalUnit || 'days',
          intervalValue: followUp.intervalValue || followUp.intervalDays || 7,
          maxFollowUps: followUp.maxFollowUps || 3,
          sentCount: 0,
          suppressedReason: null,
          nextDueAt: followUp.enabled
            ? new Date(Date.now() + computeFollowUpIntervalMs(followUp))
            : null,
        }
      : { enabled: false },
    sentAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

/** List the user's recent sent applications, newest first. */
export const getSentApplications = async (userId, max = 50) => {
  const q = query(
    collection(db, 'sentApplications'),
    where('userId', '==', userId),
    orderBy('sentAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getSentApplication = async (id) => {
  const ref = doc(db, 'sentApplications', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Sent application not found');
  return { id: snap.id, ...snap.data() };
};

/** Fetch reply subdocs (metadata + snippet only) for a sent application. */
export const getRepliesForApplication = async (sentApplicationId) => {
  const q = query(
    collection(db, 'sentApplications', sentApplicationId, 'replies'),
    orderBy('receivedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const markReplySeen = async (sentApplicationId, replyId) => {
  const ref = doc(db, 'sentApplications', sentApplicationId, 'replies', replyId);
  await updateDoc(ref, { seenAt: serverTimestamp() });
};

/** Increment follow-up counter and reschedule next reminder. */
export const recordFollowUpSent = async (sentApplicationId) => {
  const ref = doc(db, 'sentApplications', sentApplicationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const followUp = data.followUp || {};
  const newCount = (followUp.sentCount || 0) + 1;
  const maxFollowUps = followUp.maxFollowUps || 3;
  const nextDueAt = newCount >= maxFollowUps
    ? null
    : new Date(Date.now() + computeFollowUpIntervalMs(followUp));
  await updateDoc(ref, {
    'followUp.sentCount': newCount,
    'followUp.nextDueAt': nextDueAt,
    'followUp.suppressedReason': newCount >= maxFollowUps ? 'max-reached' : (followUp.suppressedReason || null),
  });
};

export const setFollowUpEnabled = async (sentApplicationId, enabled) => {
  const ref = doc(db, 'sentApplications', sentApplicationId);
  await updateDoc(ref, {
    'followUp.enabled': !!enabled,
    'followUp.suppressedReason': enabled ? null : 'manual',
  });
};

export const snoozeFollowUp = async (sentApplicationId, days = 3) => {
  const ref = doc(db, 'sentApplications', sentApplicationId);
  const nextDueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await updateDoc(ref, { 'followUp.nextDueAt': nextDueAt });
};

// ============================================================================
// NOTIFICATIONS (in-app surface for follow-up reminders + reply alerts)
// ============================================================================

export const getUnseenNotifications = async (userId, max = 50) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('seen', '==', false),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const markNotificationSeen = async (notificationId) => {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { seen: true, seenAt: serverTimestamp() });
};

/**
 * Build a compact summary used by the AI to pick the best base resume.
 * Pulls from buildFullResume() output to avoid leaking layout/theme fields.
 */
export const compactResumeSummary = (resumeMeta, fullResume) => {
  const skillsList = Object.values(fullResume?.skills || {}).flat().slice(0, 12);
  const lastExp = (fullResume?.experience || [])[0] || {};
  return {
    id: resumeMeta.id,
    name: resumeMeta.name || 'Resume',
    headline: fullResume?.personalInfo?.title || '',
    summary: (fullResume?.summary || []).slice(0, 4).join(' ').slice(0, 600),
    topSkills: skillsList,
    lastRole: lastExp.position ? `${lastExp.position}${lastExp.company ? ' @ ' + lastExp.company : ''}` : '',
    storedMatchScore: resumeMeta.matchScore || null,
  };
};

// ============================================================================
// OUTREACH USER SETTINGS (Outreach > Settings tab)
// ============================================================================

export const DEFAULT_OUTREACH_SETTINGS = {
  replyTrackingEnabled: false,
  defaultFollowUp: {
    enabled: true,
    intervalDays: 7,
    intervalUnit: 'days', // 'minutes' | 'hours' | 'days'
    intervalValue: 7,
    maxFollowUps: 3,
  },
  defaultCc: [],
  defaultBcc: [],
  signature: '',
  aiTone: 'professional', // 'professional' | 'casual' | 'enthusiastic'
  notifyOnReply: true,
  notifyOnFollowUpDue: true,
};

export const getUserSettings = async (userId) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const stored = data.outreachSettings || {};
  return {
    ...DEFAULT_OUTREACH_SETTINGS,
    ...stored,
    defaultFollowUp: {
      ...DEFAULT_OUTREACH_SETTINGS.defaultFollowUp,
      ...(stored.defaultFollowUp || {}),
    },
  };
};

/**
 * Partial update of outreach settings using dot-paths so untouched fields
 * are preserved. `defaultFollowUp` nested keys are expanded individually.
 */
export const updateUserSettings = async (userId, patch) => {
  const ref = doc(db, 'users', userId);
  const update = {};
  Object.entries(patch).forEach(([k, v]) => {
    if (k === 'defaultFollowUp' && v && typeof v === 'object') {
      Object.entries(v).forEach(([k2, v2]) => {
        update[`outreachSettings.defaultFollowUp.${k2}`] = v2;
      });
    } else {
      update[`outreachSettings.${k}`] = v;
    }
  });
  if (Object.keys(update).length === 0) return;
  await updateDoc(ref, update);
};

// ============================================================================
// EMAIL TEMPLATES (users/{uid}/emailTemplates)
// ============================================================================

export const listEmailTemplates = async (userId) => {
  const q = query(
    collection(db, 'users', userId, 'emailTemplates'),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createEmailTemplate = async (userId, { name, subject, body, tags = [] }) => {
  const ref = await addDoc(collection(db, 'users', userId, 'emailTemplates'), {
    name: name || 'Untitled template',
    subject: subject || '',
    body: body || '',
    tags,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateEmailTemplate = async (userId, templateId, patch) => {
  const ref = doc(db, 'users', userId, 'emailTemplates', templateId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
};

export const deleteEmailTemplate = async (userId, templateId) => {
  const ref = doc(db, 'users', userId, 'emailTemplates', templateId);
  await deleteDoc(ref);
};
