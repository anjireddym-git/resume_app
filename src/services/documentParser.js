/**
 * Convert file to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get MIME type from file
 */
function getMimeType(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

import { functions, httpsCallable } from '../lib/firebase';

/**
 * Use Cloud Functions to extract structured resume data from a resume file.
 *
 * Returns `{ content, layout }` where `layout` is always empty. The app uses
 * its own templates/themes instead of preserving uploaded document formatting.
 *
 * The cloud function may return either a bare resume object or the older
 * `{ content, layout }` wrapper; both shapes are normalized here.
 */
export async function extractResumeFromFile(geminiService, file) {
  const base64Data = await fileToBase64(file);
  const mimeType = getMimeType(file);

  try {
    const callAI = httpsCallable(functions, 'callAI');
    const result = await callAI({
      action: 'extractResumeFromFile',
      data: {
        base64Data,
        mimeType,
        model: 'gemini-2.5-pro',
      }
    });

    if (!result.data?.success) {
      throw new Error(result.data?.error || 'Failed to extract resume data');
    }

    const payload = result.data.data;
    // Normalize: support both new wrapper and legacy bare-resume shape.
    if (payload && (payload.content || payload.layout)) {
      return {
        content: payload.content || {},
        layout: {},
      };
    }
    return { content: payload || {}, layout: {} };
  } catch (error) {
    console.error('Error extracting resume data:', error);
    if (error.code === 'functions/resource-exhausted') {
      throw new Error('Insufficient credits. Please purchase more credits to import resumes.');
    }
    throw new Error('Failed to extract resume data: ' + error.message);
  }
}

/**
 * Legacy function - kept for compatibility but now just calls the new function
 */
export async function parseDocument(file) {
  // This is now handled directly by extractResumeFromFile
  return file;
}

/**
 * Legacy function - kept for compatibility
 */
export async function extractResumeData(geminiService, rawText) {
  // This is now handled by extractResumeFromFile
  throw new Error('Use extractResumeFromFile instead');
}

// ============================================================================
// NEW DOCX-NATIVE PIPELINE
// ============================================================================

/**
 * Parse a .docx file into a field map suitable for the DOCX-native editor.
 * Calls the `parseDocxToFieldMap` Cloud Function which classifies every
 * paragraph and returns a structured field map keyed by stable XML node IDs.
 *
 * @param {File} file  Must be a .docx file.
 * @returns {Promise<{ sections: Array, fields: Object, extractedText: string }>}
 */
export async function parseDocxToFieldMap(file) {
  if (!file) throw new Error('No file provided');
  const name = file.name.toLowerCase();
  if (!name.endsWith('.docx')) {
    throw new Error('Only .docx files are supported by the DOCX-native importer.');
  }
  const base64Data = await fileToBase64(file);
  const callAI = httpsCallable(functions, 'callAI');
  const result = await callAI({
    action: 'parseDocxToFieldMap',
    data: { base64Data },
  });
  if (!result.data?.success) {
    throw new Error(result.data?.error || 'Failed to parse DOCX');
  }
  return result.data.data;
}
