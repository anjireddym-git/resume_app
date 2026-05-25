// Client-side layout helpers used after Cloud Function returns a partial
// layoutConfig (from DOCX XML and/or AI). Validates + fills missing fields
// with defaults so the UI always has a complete config to render.

import { normalizeLayoutConfig, DEFAULT_LAYOUT_CONFIG, KNOWN_SECTIONS } from '../config/layoutSchema';

// Take a partial layoutConfig (anything from the backend) and return a
// fully-formed, validated config.
export function buildLayoutConfig(partial) {
  return normalizeLayoutConfig(partial || {});
}

export { DEFAULT_LAYOUT_CONFIG };

// Sniff a section order from content: if the content has explicit
// `customSections` they get appended after the known sections.
export function buildSectionOrder(content, layoutHint) {
  const order = [];
  const fromHint = Array.isArray(layoutHint?.sectionOrder) ? layoutHint.sectionOrder : null;

  if (fromHint && fromHint.length) {
    for (const id of fromHint) {
      if (!order.includes(id)) order.push(id);
    }
  } else {
    // Default order honoring what's present in content.
    const candidates = ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'internships', 'hackathons'];
    for (const id of candidates) {
      const val = content?.[id];
      const has = (Array.isArray(val) && val.length) || (typeof val === 'string' && val.trim().length) || (val && typeof val === 'object' && Object.keys(val).length);
      if (has) order.push(id);
    }
  }

  // Append custom section ids (preserve original order from content).
  const customs = Array.isArray(content?.customSections) ? content.customSections : [];
  for (const c of customs) {
    if (c?.id && !order.includes(c.id) && !KNOWN_SECTIONS.has(c.id)) {
      order.push(c.id);
    }
  }
  return order;
}

// Pull out the definitions (id + title) for custom sections from extracted
// content, so they can be stored on the group.
export function buildCustomSectionDefs(content) {
  const customs = Array.isArray(content?.customSections) ? content.customSections : [];
  return customs
    .filter(c => c && c.id && c.title)
    .map(c => ({ id: c.id, title: c.title }));
}

// Convert the customSections array on the content into the object-keyed map
// stored in `customData.customSections` ({ [id]: markdownString }).
export function buildCustomSectionsMap(content) {
  const customs = Array.isArray(content?.customSections) ? content.customSections : [];
  const out = {};
  for (const c of customs) {
    if (c?.id) out[c.id] = c.content || '';
  }
  return out;
}
