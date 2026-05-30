/**
 * googleDriveService.js
 *
 * Thin wrapper over the Google Drive v3 + Docs v1 REST APIs.
 * All methods take a `getAccessToken` async function (provided by AuthContext)
 * so they can refresh / re-prompt for OAuth on demand.
 *
 * Scopes required:
 *   - https://www.googleapis.com/auth/drive.file
 *   - https://www.googleapis.com/auth/documents
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const ROOT_FOLDER_NAME = 'ResumeAI';

class DriveApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Internal: authenticated fetch that handles token refresh on 401/403.
 */
async function authedFetch(getAccessToken, url, options = {}, retry = true) {
  const token = await getAccessToken();
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const res = await fetch(url, { ...options, headers });

  if ((res.status === 401 || res.status === 403) && retry) {
    // Token may be expired or revoked — try one re-auth and retry once.
    return authedFetch(getAccessToken, url, options, false);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new DriveApiError(`Drive API ${res.status}: ${res.statusText}`, res.status, body);
  }
  return res;
}

async function authedJson(getAccessToken, url, options) {
  const res = await authedFetch(getAccessToken, url, options);
  return res.json();
}

// ─── Folder operations ───────────────────────────────────────────────────────

/**
 * Find a folder by name under a parent, or null if not found.
 */
export async function findFolder(getAccessToken, name, parentId = 'root') {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = '${FOLDER_MIME}'`,
    `'${parentId}' in parents`,
    'trashed = false',
  ].join(' and ');
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&pageSize=1`;
  const data = await authedJson(getAccessToken, url);
  return data.files?.[0] || null;
}

export async function createFolder(getAccessToken, name, parentId = 'root') {
  const metadata = { name, mimeType: FOLDER_MIME, parents: [parentId] };
  const data = await authedJson(getAccessToken, `${DRIVE_API}/files?fields=id,name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
  return data;
}

export async function findOrCreateFolder(getAccessToken, name, parentId = 'root') {
  const existing = await findFolder(getAccessToken, name, parentId);
  if (existing) return existing;
  return createFolder(getAccessToken, name, parentId);
}

/**
 * Ensure the full ResumeAI/<groupName> folder path exists. Returns the
 * group folder's id.
 */
export async function ensureGroupFolder(getAccessToken, groupName) {
  const root = await findOrCreateFolder(getAccessToken, ROOT_FOLDER_NAME, 'root');
  const group = await findOrCreateFolder(getAccessToken, groupName || 'Default', root.id);
  return { rootId: root.id, folderId: group.id };
}

// ─── File operations ────────────────────────────────────────────────────────

/**
 * Upload a DOCX Blob as a new Google Doc (converted) inside the given folder.
 * Returns the file metadata { id, name, mimeType, webViewLink }.
 */
export async function uploadDocxAsGoogleDoc(getAccessToken, blob, name, folderId) {
  const metadata = {
    name,
    parents: [folderId],
    mimeType: GOOGLE_DOC_MIME, // convert DOCX → Google Doc on upload
  };

  const boundary = `boundary_${Math.random().toString(36).slice(2)}`;
  const body = await buildMultipartBody(metadata, blob, boundary);

  const url = `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink`;
  const data = await authedJson(getAccessToken, url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return data;
}

/**
 * Replace the content of an existing Google Doc (identified by fileId) with
 * a freshly generated DOCX blob.
 */
export async function updateDocxContent(getAccessToken, fileId, blob) {
  const url = `${DRIVE_UPLOAD}/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`;
  const data = await authedJson(getAccessToken, url, {
    method: 'PATCH',
    headers: { 'Content-Type': DOCX_MIME },
    body: blob,
  });
  return data;
}

/**
 * Rename a file (e.g., when the user renames the resume).
 */
export async function renameFile(getAccessToken, fileId, newName) {
  const url = `${DRIVE_API}/files/${fileId}?fields=id,name`;
  return authedJson(getAccessToken, url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
}

export async function deleteFile(getAccessToken, fileId) {
  await authedFetch(getAccessToken, `${DRIVE_API}/files/${fileId}`, { method: 'DELETE' });
}

/**
 * Get file metadata (used to verify a file still exists).
 */
export async function getFile(getAccessToken, fileId) {
  const url = `${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,modifiedTime,webViewLink,trashed`;
  return authedJson(getAccessToken, url);
}

// ─── Embed URL helpers (no API call needed) ──────────────────────────────────

/**
 * URL for a read-only embedded preview iframe of a Google Doc.
 * Works as long as the user is signed in to Google in the same browser.
 */
export function getEmbedPreviewUrl(fileId) {
  return `https://docs.google.com/document/d/${fileId}/preview`;
}

/**
 * URL for the embedded full Google Docs editor.
 * Requires the user to be signed in to Google in the same browser.
 */
export function getEmbedEditUrl(fileId) {
  return `https://docs.google.com/document/d/${fileId}/edit?rm=embedded&usp=embed_googleplus`;
}

/**
 * URL to open the doc in a new Google Docs tab (full UI).
 */
export function getOpenInDocsUrl(fileId) {
  return `https://docs.google.com/document/d/${fileId}/edit`;
}

// ─── Internals ───────────────────────────────────────────────────────────────

/**
 * Build a multipart/related body combining JSON metadata and a binary blob.
 * Required for Drive's multipart upload format.
 */
async function buildMultipartBody(metadata, blob, boundary) {
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    `Content-Type: ${DOCX_MIME}\r\n\r\n`
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const blobBuf = new Uint8Array(await blob.arrayBuffer());

  const body = new Uint8Array(head.length + blobBuf.length + tail.length);
  body.set(head, 0);
  body.set(blobBuf, head.length);
  body.set(tail, head.length + blobBuf.length);
  return body;
}

export { DriveApiError, ROOT_FOLDER_NAME };
