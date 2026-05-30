/**
 * driveSyncService.js
 *
 * High-level orchestration of "sync this resume to Google Drive".
 *
 * Flow:
 *   1. Ensure ResumeAI/<groupName>/ folder exists in user's Drive
 *   2. Generate DOCX blob from current resumeData (reuses exportService)
 *   3. If resume has no driveFileId → upload as new Google Doc
 *      Else → update existing file's content
 *   4. Persist driveFileId/folderId/syncedAt to Firestore
 */

import { ensureGroupFolder, uploadDocxAsGoogleDoc, updateDocxContent, getFile, DriveApiError } from './googleDriveService';
import { generateDocxBlob } from './exportService';
import { updateResumeDriveSync, updateGroupDriveFolder, getResumeGroup } from './resumeService';

function safeFileName(name) {
  return String(name || 'Resume').replace(/[\\/:*?"<>|]/g, ' ').trim() || 'Resume';
}

/**
 * Sync a resume to Google Drive (create or update).
 *
 * @param {Object} params
 * @param {Function} params.getAccessToken - async function returning a fresh Drive token
 * @param {Object} params.group - { id, name, driveFolderId? } current resume group
 * @param {Object} params.resume - { id, name, driveFileId?, customData, ... }
 * @param {Object} params.resumeData - the full merged resumeData to render (incl. personalInfo, sections)
 * @param {Array<string>} params.sectionOrder - visible section order
 * @returns {Promise<{ fileId, folderId, webViewLink, created }>}
 */
export async function syncResumeToDrive({ getAccessToken, group, resume, resumeData, sectionOrder }) {
  if (!group?.id) throw new Error('Group is required to sync to Drive');
  if (!resume?.id) throw new Error('Resume is required to sync to Drive');

  // ── Step 1: ensure folder exists ─────────────────────────────────────────
  let folderId = group.driveFolderId;
  let rootId = group.driveRootId;

  if (!folderId) {
    const folders = await ensureGroupFolder(getAccessToken, group.name || 'Default');
    folderId = folders.folderId;
    rootId = folders.rootId;
    // Cache on the group doc so future syncs skip the lookup
    try {
      await updateGroupDriveFolder(group.id, { driveFolderId: folderId, driveRootId: rootId });
    } catch (e) {
      console.warn('[driveSync] Could not cache group folder id:', e);
    }
  } else {
    // Validate cached folder still exists; if not, re-create
    try {
      await getFile(getAccessToken, folderId);
    } catch (err) {
      if (err instanceof DriveApiError && err.status === 404) {
        const folders = await ensureGroupFolder(getAccessToken, group.name || 'Default');
        folderId = folders.folderId;
        rootId = folders.rootId;
        await updateGroupDriveFolder(group.id, { driveFolderId: folderId, driveRootId: rootId });
      } else {
        throw err;
      }
    }
  }

  // ── Step 2: build DOCX blob ──────────────────────────────────────────────
  const blob = await generateDocxBlob(resumeData, sectionOrder);
  const fileName = safeFileName(resume.name);

  // ── Step 3: upload or update ─────────────────────────────────────────────
  let fileId = resume.driveFileId;
  let webViewLink = resume.driveWebViewLink || null;
  let created = false;

  if (fileId) {
    try {
      await updateDocxContent(getAccessToken, fileId, blob);
    } catch (err) {
      if (err instanceof DriveApiError && (err.status === 404 || err.status === 410)) {
        // File was deleted from Drive — recreate
        fileId = null;
      } else {
        throw err;
      }
    }
  }

  if (!fileId) {
    const uploaded = await uploadDocxAsGoogleDoc(getAccessToken, blob, fileName, folderId);
    fileId = uploaded.id;
    webViewLink = uploaded.webViewLink;
    created = true;
  }

  // ── Step 4: persist metadata ─────────────────────────────────────────────
  await updateResumeDriveSync(resume.id, {
    driveFileId: fileId,
    driveFolderId: folderId,
    driveWebViewLink: webViewLink,
  });

  return { fileId, folderId, webViewLink, created };
}

/**
 * Convenience: fetch the group from Firestore then run syncResumeToDrive.
 * Useful when the caller only has a groupId.
 */
export async function syncResumeToDriveByIds({ getAccessToken, groupId, resume, resumeData, sectionOrder }) {
  const group = await getResumeGroup(groupId);
  return syncResumeToDrive({ getAccessToken, group, resume, resumeData, sectionOrder });
}
