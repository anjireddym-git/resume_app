/**
 * High-level orchestration for publishing Firestore-backed resumes as managed
 * Google Docs mirrors in the user's Drive.
 */

import {
  deleteFile,
  DriveApiError,
  ensureGroupFolder,
  getFile,
  renameFile,
  updateDocxContent,
  uploadDocxAsGoogleDoc,
} from './googleDriveService';
import { generateDocxBlob } from './exportService';
import {
  getDriveCleanupQueue,
  getResumeGroup,
  removeDriveCleanup,
  updateGroupDriveFolder,
  updateResumeDriveSync,
} from './resumeService';

const syncQueues = new Map();

function safeFileName(name) {
  return String(name || 'Resume').replace(/[\\/:*?"<>|]/g, ' ').trim() || 'Resume';
}

async function ensureCurrentGroupFolder(getAccessToken, group) {
  const expectedName = group.name || 'Default';
  let folderId = group.driveFolderId;
  let rootId = group.driveRootId;

  if (folderId) {
    try {
      const existing = await getFile(getAccessToken, folderId);
      if (existing.trashed) {
        folderId = null;
      } else if (existing.name !== expectedName) {
        await renameFile(getAccessToken, folderId, expectedName);
      }
    } catch (error) {
      if (error instanceof DriveApiError && error.status === 404) {
        folderId = null;
      } else {
        throw error;
      }
    }
  }

  if (!folderId) {
    const folders = await ensureGroupFolder(getAccessToken, expectedName);
    folderId = folders.folderId;
    rootId = folders.rootId;
    try {
      await updateGroupDriveFolder(group.id, { driveFolderId: folderId, driveRootId: rootId });
    } catch (error) {
      console.warn('[driveSync] Could not cache group folder id:', error);
    }
  }

  return { folderId, rootId };
}

export async function syncResumeToDrive({ getAccessToken, group, resume, resumeData, sectionOrder, renderOptions: renderOptionsOverride }) {
  if (!group?.id) throw new Error('Group is required to sync to Drive');
  if (!resume?.id) throw new Error('Resume is required to sync to Drive');

  const { folderId } = await ensureCurrentGroupFolder(getAccessToken, group);
  const renderOptions = renderOptionsOverride || {
    sectionOrder,
    themeConfig: group.themeConfig,
    visibleSections: group.visibleSections,
    sectionFormats: resumeData?.sectionFormats || {},
    customSectionDefs: group.customSectionDefs || resumeData?.customSectionDefs || [],
  };
  const mirrorBlob = await generateDocxBlob(resumeData, renderOptions);
  const fileName = safeFileName(resume.name);
  let fileId = resume.driveFileId;
  let webViewLink = resume.driveWebViewLink || null;
  let created = false;

  if (fileId) {
    try {
      const existing = await getFile(getAccessToken, fileId);
      if (existing.trashed) {
        fileId = null;
      } else {
        await updateDocxContent(getAccessToken, fileId, mirrorBlob);
        if (existing.name !== fileName) await renameFile(getAccessToken, fileId, fileName);
        webViewLink = existing.webViewLink || webViewLink;
      }
    } catch (error) {
      if (error instanceof DriveApiError && (error.status === 404 || error.status === 410)) {
        fileId = null;
      } else {
        throw error;
      }
    }
  }

  if (!fileId) {
    const uploaded = await uploadDocxAsGoogleDoc(getAccessToken, mirrorBlob, fileName, folderId);
    fileId = uploaded.id;
    webViewLink = uploaded.webViewLink;
    created = true;
  }

  await updateResumeDriveSync(resume.id, {
    driveFileId: fileId,
    driveFolderId: folderId,
    driveWebViewLink: webViewLink,
  });
  return { fileId, folderId, webViewLink, created };
}

async function runQueuedSync(initial) {
  const queue = syncQueues.get(initial.resume.id);
  let current = initial;
  let lastDriveMetadata = {};
  let result;

  do {
    queue.pending = null;
    const group = await getResumeGroup(current.groupId);
    result = await syncResumeToDrive({
      ...current,
      group,
      resume: { ...current.resume, ...lastDriveMetadata },
    });
    lastDriveMetadata = {
      driveFileId: result.fileId,
      driveFolderId: result.folderId,
      driveWebViewLink: result.webViewLink,
    };
    current = queue.pending;
  } while (current);

  return result;
}

/**
 * Serialize per-resume syncs and keep only the latest pending render. This
 * prevents duplicate Google Docs when saves overlap during the first upload.
 */
export function syncResumeToDriveByIds(params) {
  if (!params.resume?.id) return Promise.reject(new Error('Resume is required to sync to Drive'));
  const existing = syncQueues.get(params.resume.id);
  if (existing) {
    existing.pending = params;
    return existing.promise;
  }

  const queue = { pending: null, promise: null };
  syncQueues.set(params.resume.id, queue);
  queue.promise = runQueuedSync(params).finally(() => {
    if (syncQueues.get(params.resume.id) === queue) syncQueues.delete(params.resume.id);
  });
  return queue.promise;
}

export async function drainDriveCleanup({ getAccessToken, userId }) {
  const queued = await getDriveCleanupQueue(userId);
  for (const item of queued) {
    const fileId = item.fileId || item.id;
    try {
      await deleteFile(getAccessToken, fileId);
    } catch (error) {
      if (!(error instanceof DriveApiError) || (error.status !== 404 && error.status !== 410)) {
        throw error;
      }
    }
    await removeDriveCleanup(userId, fileId);
  }
  return queued.length;
}
