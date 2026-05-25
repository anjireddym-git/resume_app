// Layout schema for preserving uploaded resume layouts.
// `layoutConfig` describes how to render a resume visually (columns, fonts,
// colors, header style, etc.) so we can persist the look of an uploaded
// resume and edit it inline without losing fidelity.
//
// Source values:
//   - layoutSource: 'template' | 'uploaded'
//       'template'  -> use existing TEMPLATES + themeConfig (legacy path)
//       'uploaded'  -> use this layoutConfig (LayoutPreservingTemplate / PDF)

export const SECTION_HEADER_STYLES = [
  'underline',     // bottom border under section title
  'background',    // colored block behind section title
  'border-left',   // vertical bar to the left of section title
  'uppercase',     // uppercase text, no other decoration
  'plain',         // no decoration
];

export const HEADER_LAYOUTS = ['centered', 'left', 'right', 'twoColumn'];
export const CONTACT_STYLES = ['row', 'stacked'];
export const COLUMN_OPTIONS = [1, 2];

// Default section assignment for 2-column layouts. Sections not listed default
// to the right (main) column.
export const DEFAULT_COLUMN_ASSIGNMENT = {
  skills: 'left',
  education: 'left',
  certifications: 'left',
  summary: 'right',
  experience: 'right',
  projects: 'right',
  internships: 'right',
  hackathons: 'right',
};

export const DEFAULT_LAYOUT_CONFIG = {
  // Page geometry (pt; matches react-pdf and CSS pt)
  pageMargins: { top: 36, right: 40, bottom: 36, left: 40 },

  // Columns
  columns: 1,
  columnSplit: 0.33,                 // fraction of width for the LEFT column when columns=2
  columnAssignment: { ...DEFAULT_COLUMN_ASSIGNMENT },

  // Header (the name + contact block at the very top)
  header: {
    layout: 'centered',              // 'centered' | 'left' | 'right' | 'twoColumn'
    contactStyle: 'row',             // 'row' | 'stacked'
    showTitle: true,
    separator: '  •  ',              // separator for inline contact items
  },

  // Fonts (web-safe families; closest match approach)
  fonts: {
    name:          { family: 'Helvetica', size: 22, weight: 'bold',   color: '#111111', letterSpacing: 0 },
    title:         { family: 'Helvetica', size: 11, weight: 'normal', color: '#555555', letterSpacing: 0 },
    sectionHeader: { family: 'Helvetica', size: 11, weight: 'bold',   color: '#111111', letterSpacing: 0.5 },
    body:          { family: 'Helvetica', size: 10, weight: 'normal', color: '#222222', letterSpacing: 0 },
    dates:         { family: 'Helvetica', size:  9, weight: 'normal', color: '#666666', letterSpacing: 0 },
  },

  // Colors
  colors: {
    primary:    '#111111',           // accent (section title underline, bars)
    text:       '#222222',
    muted:      '#666666',
    background: '#ffffff',
    sidebarBg:  '#f5f5f5',           // left column background when columns=2
    divider:    '#dddddd',
  },

  // Section title style
  sectionHeader: {
    style: 'underline',              // see SECTION_HEADER_STYLES
    spacingTop: 10,
    spacingBottom: 4,
    uppercase: true,
  },

  // Spacing
  spacing: {
    sectionGap: 10,                  // gap between sections
    itemGap: 6,                      // gap between items inside a section
    bulletGap: 2,                    // gap between bullets
    lineHeight: 1.4,
  },

  // Bullet style
  bullets: {
    symbol: '•',
    indent: 12,
  },
};

// Build a layoutConfig by deep-merging a partial config into the defaults.
// Missing keys fall back to defaults. Arrays are replaced wholesale.
export function mergeLayoutConfig(partial) {
  if (!partial || typeof partial !== 'object') return cloneLayout(DEFAULT_LAYOUT_CONFIG);
  return deepMerge(cloneLayout(DEFAULT_LAYOUT_CONFIG), partial);
}

export function cloneLayout(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch.slice();
  if (patch === null || typeof patch !== 'object') return patch;
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    const baseVal = base ? base[key] : undefined;
    const patchVal = patch[key];
    if (
      baseVal && typeof baseVal === 'object' && !Array.isArray(baseVal) &&
      patchVal && typeof patchVal === 'object' && !Array.isArray(patchVal)
    ) {
      out[key] = deepMerge(baseVal, patchVal);
    } else if (patchVal !== undefined) {
      out[key] = patchVal;
    }
  }
  return out;
}

// Validate / normalize a layoutConfig coming from AI or DOCX parsing.
// Clamps numeric ranges, enforces enums, and merges with defaults.
export function normalizeLayoutConfig(raw) {
  const cfg = mergeLayoutConfig(raw);

  // Columns
  if (!COLUMN_OPTIONS.includes(cfg.columns)) cfg.columns = 1;
  cfg.columnSplit = clamp(Number(cfg.columnSplit) || 0.33, 0.2, 0.5);

  // Header
  if (!HEADER_LAYOUTS.includes(cfg.header.layout)) cfg.header.layout = 'centered';
  if (!CONTACT_STYLES.includes(cfg.header.contactStyle)) cfg.header.contactStyle = 'row';

  // Section header style
  if (!SECTION_HEADER_STYLES.includes(cfg.sectionHeader.style)) cfg.sectionHeader.style = 'underline';

  // Page margins
  for (const side of ['top', 'right', 'bottom', 'left']) {
    cfg.pageMargins[side] = clamp(Number(cfg.pageMargins[side]) || 36, 12, 96);
  }

  // Font sizes (sanity clamp)
  for (const k of Object.keys(cfg.fonts)) {
    cfg.fonts[k].size = clamp(Number(cfg.fonts[k].size) || 10, 6, 48);
  }

  // Colors fallback
  for (const k of Object.keys(cfg.colors)) {
    if (typeof cfg.colors[k] !== 'string' || !/^#?[0-9a-fA-F]{3,8}$/.test(cfg.colors[k].replace('#', ''))) {
      cfg.colors[k] = DEFAULT_LAYOUT_CONFIG.colors[k];
    } else if (!cfg.colors[k].startsWith('#')) {
      cfg.colors[k] = '#' + cfg.colors[k];
    }
  }

  return cfg;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Section keys recognized by the layout-preserving renderer.
// Anything not in this list is treated as a custom section (freeform markdown).
export const KNOWN_SECTIONS = new Set([
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'internships',
  'hackathons',
]);
