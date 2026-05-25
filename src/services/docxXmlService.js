/**
 * DOCX I/O Service
 *
 * Pure client-side utilities for unzipping a .docx, walking its paragraph/run
 * tree to produce stable node IDs, mutating only <w:t> text content, and
 * re-zipping back to a downloadable blob.
 *
 * Stable node ID format:
 *   - Top-level paragraph run:   "p{pIdx}.r{rIdx}"
 *   - Table cell run:            "t{tIdx}.r{rowIdx}.c{cellIdx}.p{pIdx}.r{rIdx}"
 *
 * We never insert/remove paragraphs or runs during edit — only mutate the text
 * inside <w:t> nodes. All <w:rPr> (run properties / styling) tags are
 * preserved exactly.
 */

import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const DOCUMENT_XML_PATH = 'word/document.xml';

const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
  textNodeName: '#text',
  // Always treat <w:t> as having text even when empty
  alwaysCreateTextNode: true,
};

const XML_BUILDER_OPTIONS = {
  ...XML_PARSER_OPTIONS,
  format: false,
  suppressEmptyNode: false,
};

/**
 * Unzip a DOCX file (provided as ArrayBuffer or Uint8Array) into an in-memory
 * PizZip instance plus the raw document.xml string.
 *
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {{ zip: PizZip, xml: string }}
 */
export function unzipDocx(buffer) {
  const zip = new PizZip(buffer);
  const file = zip.file(DOCUMENT_XML_PATH);
  if (!file) throw new Error('Invalid DOCX: missing word/document.xml');
  return { zip, xml: file.asText() };
}

/**
 * Walk all paragraphs (including those nested in tables) and produce a flat
 * list with stable node IDs. Coalesces consecutive runs that share an
 * identical style signature so that words split mid-stream by Word are merged
 * into a single logical run.
 *
 * Coalescing rule: two adjacent runs are merged when their <w:rPr> serialized
 * form is byte-identical. The first run keeps its node ID; following runs in
 * the group keep theirs too (so we can patch the first and clear the rest).
 *
 * @param {string} xml
 * @returns {{
 *   paragraphs: Array<{
 *     pId: string,             // unique paragraph ID, e.g. "p3" or "t0.r1.c2.p0"
 *     plainText: string,
 *     runs: Array<{ rId: string, text: string, styleSig: string }>,
 *     runGroups: Array<{ ids: string[], text: string, styleSig: string }>,
 *   }>,
 * }}
 */
export function walkParagraphs(xml) {
  const paragraphs = [];

  // Lightweight pass via regex extraction: pull every <w:p>…</w:p> block in
  // document order, distinguishing those inside <w:tbl> blocks. We keep the
  // raw text only; full XML mutation happens via patchDocx using the same
  // index-based scheme so IDs remain consistent.
  const pRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  const tblRegex = /<w:tbl(\s[^>]*)?>([\s\S]*?)<\/w:tbl>/g;

  // Build a map of "table region" character offsets so we can label paragraphs
  // inside tables with their table/row/cell coordinates.
  const tables = [];
  let m;
  while ((m = tblRegex.exec(xml)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, body: m[2] });
  }

  let topLevelPIdx = 0;
  const seenInTable = new Set();

  // First, walk paragraphs inside each table to produce table-coordinate IDs.
  tables.forEach((tbl, tIdx) => {
    const rowRegex = /<w:tr(\s[^>]*)?>([\s\S]*?)<\/w:tr>/g;
    let rowMatch;
    let rowIdx = 0;
    while ((rowMatch = rowRegex.exec(tbl.body)) !== null) {
      const rowBody = rowMatch[2];
      const cellRegex = /<w:tc(\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
      let cellMatch;
      let cellIdx = 0;
      while ((cellMatch = cellRegex.exec(rowBody)) !== null) {
        const cellBody = cellMatch[2];
        const cellPRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
        let cellPMatch;
        let cellPIdx = 0;
        while ((cellPMatch = cellPRegex.exec(cellBody)) !== null) {
          const pId = `t${tIdx}.r${rowIdx}.c${cellIdx}.p${cellPIdx}`;
          const pBlock = cellPMatch[0];
          const absoluteStart = tbl.start + (rowMatch.index || 0) + (cellMatch.index || 0) + cellPMatch.index;
          seenInTable.add(absoluteStart);
          paragraphs.push(buildParagraphRecord(pId, pBlock));
          cellPIdx++;
        }
        cellIdx++;
      }
      rowIdx++;
    }
  });

  // Second, walk all top-level <w:p> blocks, skipping ones we already captured
  // as part of a table. (A <w:p> inside a table is still matched by the
  // top-level regex; we deduplicate by absolute start offset.)
  pRegex.lastIndex = 0;
  while ((m = pRegex.exec(xml)) !== null) {
    const start = m.index;
    // Skip if this paragraph is inside any table region.
    const inTable = tables.some((t) => start >= t.start && start < t.end);
    if (inTable) continue;
    const pId = `p${topLevelPIdx}`;
    paragraphs.push(buildParagraphRecord(pId, m[0]));
    topLevelPIdx++;
  }

  return { paragraphs };
}

/**
 * Parse a single <w:p>…</w:p> block into a paragraph record with run-level
 * details and a coalesced runGroups array.
 */
function buildParagraphRecord(pId, pBlock) {
  const runs = [];
  const runRegex = /<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
  let rIdx = 0;
  let rm;
  while ((rm = runRegex.exec(pBlock)) !== null) {
    const runBody = rm[2];
    // Extract <w:rPr>…</w:rPr> (style signature). May be absent.
    const rprMatch = runBody.match(/<w:rPr(\s[^>]*)?>[\s\S]*?<\/w:rPr>/);
    const styleSig = rprMatch ? rprMatch[0] : '';
    // Concatenate all <w:t> text nodes (Word can put multiple in one run).
    const textRegex = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let text = '';
    let tm;
    while ((tm = textRegex.exec(runBody)) !== null) {
      text += tm[2];
    }
    runs.push({ rId: `${pId}.r${rIdx}`, text, styleSig });
    rIdx++;
  }

  // Coalesce adjacent runs with identical style signatures.
  const runGroups = [];
  for (const r of runs) {
    const last = runGroups[runGroups.length - 1];
    if (last && last.styleSig === r.styleSig) {
      last.ids.push(r.rId);
      last.text += r.text;
    } else {
      runGroups.push({ ids: [r.rId], text: r.text, styleSig: r.styleSig });
    }
  }

  const plainText = runs.map((r) => r.text).join('');
  return { pId, plainText, runs, runGroups };
}

/**
 * Apply a single field edit. Mutates the XML by setting the new text into the
 * first run referenced by `nodeIds` and clearing the remaining runs' text
 * (preserving their <w:rPr>). Runs not referenced by `nodeIds` are untouched.
 *
 * @param {string} xml
 * @param {string[]} nodeIds       Ordered list of run IDs ("p3.r0" etc.) to update.
 * @param {string} newText
 * @returns {string} updated XML
 */
export function patchXml(xml, nodeIds, newText) {
  if (!nodeIds?.length) return xml;
  // Index every <w:r>…</w:r> in document order and map ID → range.
  const runIndex = indexRuns(xml);
  // Sort node IDs by their character offset descending so replacements don't
  // shift earlier offsets.
  const ranges = nodeIds
    .map((id) => runIndex.get(id))
    .filter(Boolean)
    .sort((a, b) => b.start - a.start);

  if (ranges.length === 0) return xml;

  // The first node ID (in original input order) receives the new text; the
  // rest are cleared. Determine which range corresponds to the first ID.
  const firstId = nodeIds[0];
  const firstRange = runIndex.get(firstId);

  let result = xml;
  for (const range of ranges) {
    const original = result.slice(range.start, range.end);
    const isFirst = range === firstRange;
    const replacement = setRunText(original, isFirst ? newText : '');
    result = result.slice(0, range.start) + replacement + result.slice(range.end);
  }
  return result;
}

/**
 * Build a lookup of run IDs → { start, end } character offsets within the XML.
 * Uses the same walking logic as walkParagraphs so IDs match.
 */
function indexRuns(xml) {
  const map = new Map();
  const tables = [];
  const tblRegex = /<w:tbl(\s[^>]*)?>([\s\S]*?)<\/w:tbl>/g;
  let m;
  while ((m = tblRegex.exec(xml)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, body: m[2], bodyStart: m.index + m[0].indexOf(m[2]) });
  }

  // Table-cell paragraphs first.
  tables.forEach((tbl, tIdx) => {
    const rowRegex = /<w:tr(\s[^>]*)?>([\s\S]*?)<\/w:tr>/g;
    let rowMatch;
    let rowIdx = 0;
    while ((rowMatch = rowRegex.exec(tbl.body)) !== null) {
      const rowBody = rowMatch[2];
      const rowBodyAbs = tbl.bodyStart + rowMatch.index + rowMatch[0].indexOf(rowBody);
      const cellRegex = /<w:tc(\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
      let cellMatch;
      let cellIdx = 0;
      while ((cellMatch = cellRegex.exec(rowBody)) !== null) {
        const cellBody = cellMatch[2];
        const cellBodyAbs = rowBodyAbs + cellMatch.index + cellMatch[0].indexOf(cellBody);
        const cellPRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
        let cellPMatch;
        let cellPIdx = 0;
        while ((cellPMatch = cellPRegex.exec(cellBody)) !== null) {
          const pAbs = cellBodyAbs + cellPMatch.index;
          const pId = `t${tIdx}.r${rowIdx}.c${cellIdx}.p${cellPIdx}`;
          indexRunsWithinParagraph(map, xml, pAbs, cellPMatch[0], pId);
          cellPIdx++;
        }
        cellIdx++;
      }
      rowIdx++;
    }
  });

  // Top-level paragraphs.
  const pRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let topLevelPIdx = 0;
  while ((m = pRegex.exec(xml)) !== null) {
    const start = m.index;
    const inTable = tables.some((t) => start >= t.start && start < t.end);
    if (inTable) continue;
    const pId = `p${topLevelPIdx}`;
    indexRunsWithinParagraph(map, xml, start, m[0], pId);
    topLevelPIdx++;
  }

  return map;
}

function indexRunsWithinParagraph(map, xml, pAbs, pBlock, pId) {
  const runRegex = /<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
  let rIdx = 0;
  let rm;
  while ((rm = runRegex.exec(pBlock)) !== null) {
    const absStart = pAbs + rm.index;
    const absEnd = absStart + rm[0].length;
    map.set(`${pId}.r${rIdx}`, { start: absStart, end: absEnd });
    rIdx++;
  }
}

/**
 * Replace the concatenated text of all <w:t> nodes inside a single <w:r>
 * block, preserving its <w:rPr>. If newText is empty we leave a single
 * empty <w:t xml:space="preserve"></w:t>. If multiple <w:t> nodes exist, we
 * collapse them: first <w:t> gets full newText, others are emptied.
 */
function setRunText(runXml, newText) {
  // Escape XML special chars in newText.
  const escaped = escapeXml(newText);
  const textRegex = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const matches = [...runXml.matchAll(textRegex)];
  if (matches.length === 0) {
    // No <w:t> in this run (e.g. it's an image or break). Don't modify.
    return runXml;
  }
  // Replace first match with newText (preserve its attributes), empty the rest.
  let cursor = 0;
  let out = '';
  matches.forEach((mm, idx) => {
    const start = mm.index;
    const end = mm.index + mm[0].length;
    out += runXml.slice(cursor, start);
    const attrs = mm[1] || '';
    // Always include xml:space="preserve" to keep leading/trailing whitespace.
    const safeAttrs = /xml:space\s*=/.test(attrs) ? attrs : `${attrs} xml:space="preserve"`;
    if (idx === 0) {
      out += `<w:t${safeAttrs}>${escaped}</w:t>`;
    } else {
      out += `<w:t${safeAttrs}></w:t>`;
    }
    cursor = end;
  });
  out += runXml.slice(cursor);
  return out;
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Write updated XML back into the zip and return the modified PizZip instance.
 * Caller can then call zipToBlob() to materialize.
 */
export function writeXml(zip, xml) {
  zip.file(DOCUMENT_XML_PATH, xml);
  return zip;
}

/**
 * Generate a Blob from the current zip state, ready for download/upload.
 *
 * @param {PizZip} zip
 * @returns {Blob}
 */
export function zipToBlob(zip) {
  const u8 = zip.generate({ type: 'uint8array' });
  return new Blob([u8], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Convenience: apply a batch of field edits to an existing zip and produce a
 * new zip + blob in one shot.
 *
 * @param {PizZip} zip
 * @param {Record<string, { nodeIds: string[], text: string }>} edits
 *        Map of fieldId → { nodeIds, text } (only `nodeIds` and `text` used).
 * @returns {{ zip: PizZip, xml: string, blob: Blob }}
 */
export function applyEdits(zip, edits) {
  let xml = zip.file(DOCUMENT_XML_PATH).asText();
  for (const fieldId of Object.keys(edits)) {
    const { nodeIds, text } = edits[fieldId] || {};
    if (!nodeIds?.length) continue;
    xml = patchXml(xml, nodeIds, text ?? '');
  }
  writeXml(zip, xml);
  return { zip, xml, blob: zipToBlob(zip) };
}

// Unused but exported for future XML structure inspection if needed.
export const _internal = { XMLParser, XMLBuilder, XML_PARSER_OPTIONS, XML_BUILDER_OPTIONS };
