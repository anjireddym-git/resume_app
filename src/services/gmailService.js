/**
 * Client-side Gmail REST helper.
 *
 * Sends mail through the signed-in user's own Gmail account using an OAuth
 * access token that carries the `gmail.send` scope. The token is supplied by
 * the caller (`AuthContext.ensureGmailAccess()`) and is NEVER persisted.
 *
 * No external dependencies — multipart MIME is hand-built so we don't bloat
 * the bundle. Attachments are passed as Blobs.
 */

const GMAIL_SEND_URL =
  'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

export class GmailAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GmailAuthError';
    this.code = 'gmail/unauthenticated';
  }
}

const bytesToBinaryString = (uint8) => {
  // Avoid spreading huge arrays into String.fromCharCode.apply (stack overflow
  // for large attachments). Build the binary string in chunks.
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunk));
  }
  return binary;
};

const utf8Bytes = (str) => new TextEncoder().encode(String(str ?? ''));

const base64EncodeBytes = (uint8) => btoa(bytesToBinaryString(uint8));

const base64EncodeUtf8 = (str) => base64EncodeBytes(utf8Bytes(str));

const base64UrlEncode = (str) =>
  base64EncodeUtf8(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const base64UrlEncodeBytes = (uint8) => {
  return base64EncodeBytes(uint8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const wrapBase64 = (value) => String(value || '').match(/.{1,76}/g)?.join('\r\n') || '';

const sanitizeHeaderValue = (value) =>
  String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

const hasNonAscii = (value) => /[^\x20-\x7E]/.test(value);

export const encodeMimeHeaderValue = (value) => {
  const clean = sanitizeHeaderValue(value);
  if (!clean || !hasNonAscii(clean)) return clean;

  const chunks = [];
  let current = '';
  let currentBytes = 0;
  for (const char of clean) {
    const byteLength = utf8Bytes(char).length;
    if (current && currentBytes + byteLength > 36) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += byteLength;
  }
  if (current) chunks.push(current);

  return chunks
    .map((chunk) => `=?UTF-8?B?${base64EncodeUtf8(chunk)}?=`)
    .join('\r\n ');
};

const formatHeaderPhrase = (value) => {
  const clean = sanitizeHeaderValue(value);
  if (!clean) return '';
  if (hasNonAscii(clean)) return encodeMimeHeaderValue(clean);
  if (/^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~ ]+$/.test(clean)) return clean;
  return `"${clean.replace(/(["\\])/g, '\\$1')}"`;
};

const asciiFilenameFallback = (value) => {
  const clean = sanitizeHeaderValue(value) || 'attachment';
  return clean.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
};

const encodeRfc5987Value = (value) =>
  encodeURIComponent(sanitizeHeaderValue(value))
    .replace(/['()]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A');

const normalizeRecipients = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((s) => sanitizeHeaderValue(s)).filter(Boolean);
  return String(input).split(',').map((s) => sanitizeHeaderValue(s)).filter(Boolean);
};

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export const validateEmail = (addr) => EMAIL_RE.test(String(addr || '').trim());

export const formatGmailWatchError = (err) => {
  const message = String(err?.message || err || '');
  const topicMatch = message.match(/projects\/[^/\s"'{}]+\/topics\/[^/\s"'{}]+/);
  const topicName = topicMatch?.[0] || 'your Gmail Pub/Sub topic';

  if (/Gmail watch failed|Cloud PubSub|Cloud Pub\/Sub|PERMISSION_DENIED|not authorized|forbidden/i.test(message)) {
    return (
      `Reply tracking needs Google Cloud setup. Grant Pub/Sub Publisher on ${topicName} ` +
      'to gmail-api-push@system.gserviceaccount.com, deploy functions/indexes, then try again.'
    );
  }

  return message || 'Failed to enable reply tracking.';
};

/**
 * Build a RFC 2822 multipart/mixed MIME message with a base64-encoded
 * attachment. Returns the message body as a string.
 */
export async function buildMimeMessage({
  fromName,
  fromEmail,
  to,
  cc,
  bcc,
  subject,
  body,
  attachment,
  inReplyTo,
  references,
}) {
  const boundary = `=_rsm_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const toHeader = normalizeRecipients(to).join(', ');
  const ccHeader = normalizeRecipients(cc).join(', ');
  const bccHeader = normalizeRecipients(bcc).join(', ');
  if (!toHeader) throw new Error('At least one "To" recipient is required');

  const fromHeader = fromName
    ? `${formatHeaderPhrase(fromName)} <${sanitizeHeaderValue(fromEmail)}>`
    : sanitizeHeaderValue(fromEmail);
  const headerLines = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    ccHeader ? `Cc: ${ccHeader}` : null,
    bccHeader ? `Bcc: ${bccHeader}` : null,
    `Subject: ${encodeMimeHeaderValue(subject || '')}`,
    'MIME-Version: 1.0',
    inReplyTo ? `In-Reply-To: ${sanitizeHeaderValue(inReplyTo)}` : null,
    references ? `References: ${sanitizeHeaderValue(references)}` : null,
  ].filter(Boolean);

  const encodedBody = wrapBase64(base64EncodeUtf8(body || ''));

  if (!attachment) {
    return (
      [
        ...headerLines,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        encodedBody,
      ].join('\r\n')
    );
  }

  const buf = new Uint8Array(await attachment.blob.arrayBuffer());
  const attachmentB64 = base64UrlEncodeBytes(buf)
    // Gmail tolerates standard base64 too; switch back for safety in MIME body.
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const wrapped = wrapBase64(attachmentB64);
  const attachmentFilename = sanitizeHeaderValue(attachment.filename) || 'attachment';
  const fallbackFilename = asciiFilenameFallback(attachmentFilename);
  const filenameStar = hasNonAscii(attachmentFilename)
    ? `; filename*=UTF-8''${encodeRfc5987Value(attachmentFilename)}`
    : '';

  return [
    ...headerLines,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody,
    '',
    `--${boundary}`,
    `Content-Type: ${attachment.mimeType || 'application/octet-stream'}; name="${fallbackFilename}"`,
    `Content-Disposition: attachment; filename="${fallbackFilename}"${filenameStar}`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapped,
    '',
    `--${boundary}--`,
  ].join('\r\n');
}

/**
 * Send an email through the user's Gmail account.
 *
 * @param {object} args
 * @param {string} args.accessToken           OAuth token with gmail.send scope.
 * @param {string} args.fromEmail             Sender (must match the signed-in user).
 * @param {string} [args.fromName]
 * @param {string|string[]} args.to
 * @param {string|string[]} [args.cc]
 * @param {string|string[]} [args.bcc]
 * @param {string} args.subject
 * @param {string} args.body                  Plain-text body.
 * @param {object} [args.attachment]          { filename, mimeType, blob }.
 * @param {string} [args.threadId]            Pass to keep follow-ups in the same Gmail thread.
 * @param {string} [args.inReplyTo]           Message-Id of the message we are replying to.
 * @returns {Promise<{ id: string, threadId: string, messageId?: string }>}
 */
export async function sendGmail({
  accessToken,
  fromEmail,
  fromName,
  to,
  cc,
  bcc,
  subject,
  body,
  attachment,
  threadId,
  inReplyTo,
}) {
  if (!accessToken) throw new GmailAuthError('Missing Gmail access token');

  const raw = await buildMimeMessage({
    fromName,
    fromEmail,
    to,
    cc,
    bcc,
    subject,
    body,
    attachment,
    inReplyTo,
    references: inReplyTo,
  });

  const payload = { raw: base64UrlEncode(raw) };
  if (threadId) payload.threadId = threadId;

  let resp;
  try {
    // The Message.raw field already contains the full RFC 2822 MIME message,
    // including attachments, encoded as base64url. Gmail accepts that JSON
    // resource on the standard send endpoint. The /upload endpoint expects a
    // multipart upload protocol body and rejects JSON { raw } with 400.
    resp = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(`Could not reach Gmail API: ${err.message || 'network request failed'}`);
  }

  if (resp.status === 401 || resp.status === 403) {
    const errBody = await resp.text().catch(() => '');
    throw new GmailAuthError(`Gmail rejected the access token (${resp.status}): ${errBody}`);
  }
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Gmail send failed: ${resp.status} ${errBody}`);
  }
  const json = await resp.json();
  return { id: json.id, threadId: json.threadId };
}

/**
 * Fetch the Message-Id header of a sent message so follow-ups can use
 * In-Reply-To / References. Best-effort; returns null on failure.
 */
export async function getMessageIdHeader(accessToken, messageId) {
  try {
    const resp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Message-Id`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    const header = (json.payload?.headers || []).find(
      (h) => h.name.toLowerCase() === 'message-id'
    );
    return header?.value || null;
  } catch {
    return null;
  }
}
