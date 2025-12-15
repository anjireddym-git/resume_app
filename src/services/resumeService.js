import {
  collection,
  doc,
  addDoc,
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
import { db } from '../lib/firebase';
import { DEFAULT_THEME_CONFIG } from '../config/themeConfig';

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
  
  const resumeRef = await addDoc(collection(db, 'resumes'), {
    userId,
    groupId,
    name: resumeData.name || `Resume v${version}`,
    version,
    jobDescription: resumeData.jobDescription || '',
    customData: {
      summary: resumeData.summary || '',
      experience: resumeData.experience || [], // Highlights, environment per job
      skills: resumeData.skills || {},
      projects: resumeData.projects || [],
      certifications: resumeData.certifications || [],
    },
    // Section format settings
    sectionFormats: resumeData.sectionFormats || {
      summary: 'paragraph',
      skills: 'grouped',
      experience: 'detailed',
      education: 'detailed',
      projects: 'detailed',
      certifications: 'inline',
      internships: 'detailed',
      hackathons: 'detailed',
      header: 'centered',
    },
    sectionFormats: resumeData.sectionFormats || {
      summary: 'paragraph',
      skills: 'grouped',
      experience: 'detailed',
      education: 'detailed',
      projects: 'detailed',
      certifications: 'inline',
      internships: 'detailed',
      hackathons: 'detailed',
      header: 'centered',
    },
    matchScore: null,
    matchAnalysis: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  
  // Update group resume count
  await updateDoc(doc(db, 'resumeGroups', groupId), {
    resumeCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  
  return resumeRef.id;
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

export const updateResumeCustomData = async (resumeId, customData) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    customData,
    updatedAt: serverTimestamp(),
  });
};

export const updateResumeSectionFormats = async (resumeId, sectionFormats) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    sectionFormats,
    updatedAt: serverTimestamp(),
  });
};

export const updateResumeSectionFormat = async (resumeId, sectionId, formatId) => {
  const resumeRef = doc(db, 'resumes', resumeId);
  await updateDoc(resumeRef, {
    [`sectionFormats.${sectionId}`]: formatId,
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
  await deleteDoc(doc(db, 'resumes', resumeId));
  
  // Decrement group resume count
  await updateDoc(doc(db, 'resumeGroups', groupId), {
    resumeCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
};

// ============ VERSION SNAPSHOTS ============

// Create a version snapshot before AI updates
export const createVersionSnapshot = async (resumeId, customData, metadata = {}) => {
  const snapshotRef = await addDoc(collection(db, 'resumes', resumeId, 'versions'), {
    customData,
    jobDescription: metadata.jobDescription || '',
    fieldsUpdated: metadata.fieldsUpdated || [],
    label: metadata.label || 'Before AI update',
    createdAt: serverTimestamp(),
  });
  
  return snapshotRef.id;
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
  const defaultFormats = {
    summary: 'paragraph',
    skills: 'grouped',
    experience: 'detailed',
    education: 'detailed',
    projects: 'detailed',
    certifications: 'inline',
    internships: 'detailed',
    hackathons: 'detailed',
    header: 'centered',
  };
  
  return {
    personalInfo: mergedPersonalInfo,
    summary: custom.summary || '',
    experience: mergedExperience,
    education: custom.education?.length ? custom.education : (shared.education || []),
    skills: custom.skills || {},
    projects: custom.projects || [],
    certifications: custom.certifications || [],
    internships: custom.internships || [],
    hackathons: custom.hackathons || [],
    sectionFormats: { ...defaultFormats, ...(resume.sectionFormats || {}) },
    themeConfig: group.themeConfig || DEFAULT_THEME_CONFIG,


  };
};
