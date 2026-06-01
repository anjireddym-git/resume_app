/**
 * googleDriveService.js
 *
 * Thin wrapper over the Google Drive v3 REST API.
 * All methods take a `getAccessToken` async function (provided by AuthContext)
 * so callers can require an already-authorized token without triggering
 * OAuth popups from background work.
 *
 * Scopes required:
 *   - https://www.googleapis.com/auth/drive.file
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const HTML_MIME = 'text/html; charset=UTF-8';
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const ROOT_FOLDER_NAME = 'ResumeAI';
const MAX_UPLOAD_RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetriableDriveStatus(status) {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

function summarizeBody(body) {
  const text = String(body || '').trim();
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

export function classifyDriveApiError(status, body = '') {
  const normalized = String(body).toLowerCase();
  if (status === 401) return 'authorization-required';
  if (status === 403 && (
    normalized.includes('accessnotconfigured')
    || normalized.includes('service_disabled')
    || normalized.includes('api has not been used')
    || normalized.includes('api is disabled')
    || normalized.includes('enable it by visiting')
  )) {
    return 'api-disabled';
  }
  if (status === 403 && (
    normalized.includes('insufficient authentication scopes')
    || normalized.includes('insufficientpermissions')
    || normalized.includes('insufficient permission')
  )) {
    return 'authorization-required';
  }
  if (status === 403) return 'permission-denied';
  if (isRetriableDriveStatus(status)) return 'server-error';
  return 'request-failed';
}

class DriveApiError extends Error {
  constructor(message, status, body, kind = classifyDriveApiError(status, body)) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
    this.body = body;
    this.kind = kind;
  }
}

/**
 * Internal: authenticated fetch. Authorization failures are surfaced to the UI
 * so a reconnect popup can be opened only from a user click.
 */
async function authedFetch(getAccessToken, url, options = {}, retryCount = 0) {
  const token = await getAccessToken();
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (isRetriableDriveStatus(res.status) && retryCount < MAX_UPLOAD_RETRIES) {
      await sleep(400 * (retryCount + 1));
      return authedFetch(getAccessToken, url, options, retryCount + 1);
    }
    const detail = summarizeBody(body) || res.statusText || 'Request failed';
    throw new DriveApiError(`Drive API ${res.status}: ${detail}`, res.status, body);
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
  const body = await buildMultipartBody(metadata, blob, boundary, DOCX_MIME);

  const url = `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink`;
  const data = await authedJson(getAccessToken, url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return data;
}

/**
 * Upload HTML as a new Google Doc (converted) inside the given folder.
 * HTML import is used for the managed Drive mirror because it is less brittle
 * than DOCX conversion for generated resume content.
 */
export async function uploadHtmlAsGoogleDoc(getAccessToken, htmlBlob, name, folderId) {
  const metadata = {
    name,
    parents: [folderId],
    mimeType: GOOGLE_DOC_MIME,
  };

  const boundary = `boundary_${Math.random().toString(36).slice(2)}`;
  const body = await buildMultipartBody(metadata, htmlBlob, boundary, HTML_MIME);

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
 * Replace an existing Google Doc with freshly generated HTML content.
 */
export async function updateHtmlContent(getAccessToken, fileId, htmlBlob) {
  const url = `${DRIVE_UPLOAD}/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`;
  const data = await authedJson(getAccessToken, url, {
    method: 'PATCH',
    headers: { 'Content-Type': HTML_MIME },
    body: htmlBlob,
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
async function buildMultipartBody(metadata, blob, boundary, mediaMimeType) {
  const head =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    `Content-Type: ${mediaMimeType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  return new Blob([head, blob, tail], { type: `multipart/related; boundary=${boundary}` });
}

export { DriveApiError, ROOT_FOLDER_NAME };
