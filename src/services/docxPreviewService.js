/**
 * docx-preview wrapper service.
 *
 * Renders a DOCX blob into an HTML container using the `docx-preview` library.
 * Handles container reset, error capture, and provides a consistent API for
 * the LiveDocxPreview component.
 */

import { renderAsync } from 'docx-preview';

const DEFAULT_OPTIONS = {
  className: 'docx-preview',
  inWrapper: true,
  ignoreWidth: false,
  ignoreHeight: false,
  ignoreFonts: false,
  breakPages: true,
  ignoreLastRenderedPageBreak: true,
  experimental: true,
  trimXmlDeclaration: true,
  useBase64URL: false,
  renderHeaders: true,
  renderFooters: true,
  renderFootnotes: true,
  renderEndnotes: true,
};

/**
 * Render a DOCX blob into the given container element.
 *
 * @param {Blob} blob       The DOCX file to render.
 * @param {HTMLElement} container  Target DOM element. Will be cleared before render.
 * @param {object} [options] Optional overrides for docx-preview options.
 * @returns {Promise<void>}
 */
export async function renderDocx(blob, container, options = {}) {
  if (!blob) throw new Error('renderDocx: blob is required');
  if (!container) throw new Error('renderDocx: container is required');
  // Clear previous render.
  container.innerHTML = '';
  await renderAsync(blob, container, null, { ...DEFAULT_OPTIONS, ...options });
}
