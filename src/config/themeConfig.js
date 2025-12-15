export const DEFAULT_THEME_CONFIG = {
  // Typography
  typography: {
    fontFamily: 'Helvetica', // Helvetica, Times-Roman, Courier, Georgia, etc.
    fontSize: 10, // Base font size
    lineHeight: 1.4,
    headingScale: 1.2, // Multiplier for section headers
    nameScale: 2.2, // Multiplier for name
    letterSpacing: 0, // Letter spacing for body text
  },

  // Spacing & Layout
  spacing: {
    pagePadding: 40,
    sectionMargin: 12, // Space between sections
    itemMargin: 8, // Space between items (jobs)
    marginScale: 1.0, // Global multiplier for margins
    density: 'balanced', // spacious, balanced, compact, dense
  },

  // Colors
  colors: {
    text: '#1f2937', // Gray-800
    secondary: '#4b5563', // Gray-600 (dates, locations)
    accent: '#2563eb', // Primary brand color (links, maybe bullets)
    border: '#e5e7eb', // Gray-200
    background: '#ffffff',
    sectionTitleColor: '#374151', // Section title color
  },

  // Header Styling
  header: {
    layout: 'centered', // centered, left, twoColumn
    nameBold: true,
    nameUppercase: false,
    nameLetterSpacing: 0.5, // Letter spacing for name
    contactSeparator: '|', // |, •, -, /, ,
    showIcons: false, // Show icons for contact items
    titleStyle: 'normal', // normal, italic, uppercase
    nameDivider: false, // Show divider line below name
  },

  // Section Styling
  sectionTitle: {
    uppercase: true,
    bold: true,
    border: 'bottom', // none, bottom, double, thick, accent-left, top-bottom, dotted
    borderWidth: 0.5, // Border thickness
    align: 'left', // left, center
    accentBar: false, // Show accent color bar on left
    letterSpacing: 1, // Letter spacing for section titles
  },

  // Content Styling
  content: {
    bulletStyle: '•', // •, -, ▸, ▪, >, ★, ◆
    dateAlign: 'right', // right, below, inline
    dateFormat: 'MMM YYYY', // MMM YYYY, MM/YYYY, MMMM YYYY, YYYY
    showLocation: true, // Show location in experience
    locationStyle: 'inline', // inline, below, right
    companyFirst: false, // Show company before position
    skillProficiency: 'none', // none, level, years
  },

  // Experience Entry Styling
  experience: {
    entryStyle: 'standard', // standard, compact, detailed
    titlePosition: 'position-first', // position-first, company-first
    locationPlacement: 'inline', // inline, separate, right
    datePosition: 'right', // right, below, inline
    highlightBullets: true, // Show bullet points for highlights
  },

  // ATS Optimization
  ats: {
    useStandardSections: true, // Use standard section naming
    avoidGraphics: true, // Avoid complex graphics
    simpleLayout: true, // Use simple single-column layout
  },
};

// Content density presets
export const DENSITY_PRESETS = {
  spacious: {
    pagePadding: 48,
    sectionMargin: 16,
    itemMargin: 10,
    lineHeight: 1.6,
    fontSize: 11,
  },
  balanced: {
    pagePadding: 40,
    sectionMargin: 12,
    itemMargin: 8,
    lineHeight: 1.4,
    fontSize: 10,
  },
  compact: {
    pagePadding: 32,
    sectionMargin: 8,
    itemMargin: 6,
    lineHeight: 1.3,
    fontSize: 9.5,
  },
  dense: {
    pagePadding: 24,
    sectionMargin: 6,
    itemMargin: 4,
    lineHeight: 1.2,
    fontSize: 9,
  },
};

// Preset themes for quick selection
export const THEME_PRESETS = {
  professional: {
    name: 'Professional',
    description: 'Clean and corporate-friendly',
    icon: 'Briefcase',
    config: {
      typography: { fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.4 },
      colors: { text: '#1f2937', secondary: '#4b5563', accent: '#1e40af', border: '#d1d5db' },
      header: { layout: 'left', nameBold: true, nameUppercase: false },
      sectionTitle: { uppercase: true, bold: true, border: 'bottom', align: 'left' },
      content: { bulletStyle: '•', dateAlign: 'right' },
    },
  },
  executive: {
    name: 'Executive',
    description: 'Elegant and authoritative',
    icon: 'Crown',
    config: {
      typography: { fontFamily: 'Georgia', fontSize: 10.5, lineHeight: 1.5 },
      colors: { text: '#111827', secondary: '#374151', accent: '#0f172a', border: '#9ca3af' },
      header: { layout: 'centered', nameBold: true, nameUppercase: true, nameLetterSpacing: 2 },
      sectionTitle: { uppercase: true, bold: true, border: 'double', align: 'center' },
      content: { bulletStyle: '▪', dateAlign: 'right' },
    },
  },
  modern: {
    name: 'Modern',
    description: 'Contemporary and stylish',
    icon: 'Sparkles',
    config: {
      typography: { fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.4 },
      colors: { text: '#18181b', secondary: '#52525b', accent: '#7c3aed', border: '#e4e4e7' },
      header: { layout: 'twoColumn', nameBold: true, nameUppercase: false },
      sectionTitle: { uppercase: false, bold: true, border: 'accent-left', align: 'left' },
      content: { bulletStyle: '▸', dateAlign: 'right' },
    },
  },
  minimalist: {
    name: 'Minimalist',
    description: 'Simple and clean',
    icon: 'Minus',
    config: {
      typography: { fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.4 },
      colors: { text: '#27272a', secondary: '#71717a', accent: '#27272a', border: '#f4f4f5' },
      header: { layout: 'left', nameBold: false, nameUppercase: false },
      sectionTitle: { uppercase: true, bold: true, border: 'none', align: 'left' },
      content: { bulletStyle: '-', dateAlign: 'right' },
    },
  },
  creative: {
    name: 'Creative',
    description: 'Bold and expressive',
    icon: 'Palette',
    config: {
      typography: { fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.4 },
      colors: { text: '#1e293b', secondary: '#475569', accent: '#0891b2', border: '#cbd5e1' },
      header: { layout: 'centered', nameBold: true, nameUppercase: false, nameDivider: true },
      sectionTitle: { uppercase: true, bold: true, border: 'thick', align: 'left' },
      content: { bulletStyle: '◆', dateAlign: 'right' },
    },
  },
  academic: {
    name: 'Academic',
    description: 'Traditional and scholarly',
    icon: 'GraduationCap',
    config: {
      typography: { fontFamily: 'Times-Roman', fontSize: 11, lineHeight: 1.5 },
      colors: { text: '#1c1917', secondary: '#44403c', accent: '#1c1917', border: '#a8a29e' },
      header: { layout: 'centered', nameBold: true, nameUppercase: false },
      sectionTitle: { uppercase: false, bold: true, border: 'bottom', align: 'center' },
      content: { bulletStyle: '•', dateAlign: 'right' },
    },
  },
  tech: {
    name: 'Tech',
    description: 'Modern developer style',
    icon: 'Code',
    config: {
      typography: { fontFamily: 'Helvetica', fontSize: 9.5, lineHeight: 1.35 },
      colors: { text: '#0f172a', secondary: '#475569', accent: '#059669', border: '#e2e8f0' },
      header: { layout: 'left', nameBold: true, nameUppercase: false },
      sectionTitle: { uppercase: true, bold: true, border: 'accent-left', align: 'left' },
      content: { bulletStyle: '▸', dateAlign: 'right' },
    },
  },
  classic: {
    name: 'Classic',
    description: 'Timeless and traditional',
    icon: 'FileText',
    config: {
      typography: { fontFamily: 'Times-Roman', fontSize: 10.5, lineHeight: 1.45 },
      colors: { text: '#1f2937', secondary: '#4b5563', accent: '#1f2937', border: '#d1d5db' },
      header: { layout: 'centered', nameBold: true, nameUppercase: true },
      sectionTitle: { uppercase: true, bold: true, border: 'bottom', align: 'left' },
      content: { bulletStyle: '•', dateAlign: 'right' },
    },
  },
};

export const THEME_OPTIONS = {
  fonts: [
    { label: 'Helvetica (Modern Sans)', value: 'Helvetica' },
    { label: 'Times Roman (Classic Serif)', value: 'Times-Roman' },
    { label: 'Courier (Monospace)', value: 'Courier' },
    { label: 'Georgia (Elegant Serif)', value: 'Georgia' },
  ],
  headerLayouts: [
    { label: 'Centered', value: 'centered', description: 'Name centered, contact below' },
    { label: 'Left Aligned', value: 'left', description: 'All content left-aligned' },
    { label: 'Two Column', value: 'twoColumn', description: 'Name left, contact right' },
  ],
  separators: [
    { label: 'Pipe (|)', value: '|' },
    { label: 'Bullet (•)', value: '•' },
    { label: 'Dash (-)', value: '-' },
    { label: 'Slash (/)', value: '/' },
    { label: 'Comma (,)', value: ',' },
    { label: 'Diamond (◆)', value: '◆' },
  ],
  borders: [
    { label: 'None', value: 'none', description: 'No border' },
    { label: 'Underline', value: 'bottom', description: 'Simple line below' },
    { label: 'Double Line', value: 'double', description: 'Double underline' },
    { label: 'Thick Line', value: 'thick', description: 'Bold underline' },
    { label: 'Accent Bar', value: 'accent-left', description: 'Color bar on left' },
    { label: 'Top & Bottom', value: 'top-bottom', description: 'Lines above and below' },
    { label: 'Dotted', value: 'dotted', description: 'Dotted underline' },
  ],
  bulletStyles: [
    { label: 'Bullet (•)', value: '•' },
    { label: 'Dash (-)', value: '-' },
    { label: 'Arrow (▸)', value: '▸' },
    { label: 'Square (▪)', value: '▪' },
    { label: 'Chevron (>)', value: '>' },
    { label: 'Star (★)', value: '★' },
    { label: 'Diamond (◆)', value: '◆' },
  ],
  dateFormats: [
    { label: 'Jan 2024', value: 'MMM YYYY' },
    { label: '01/2024', value: 'MM/YYYY' },
    { label: 'January 2024', value: 'MMMM YYYY' },
    { label: '2024', value: 'YYYY' },
  ],
  densities: [
    { label: 'Spacious', value: 'spacious', description: 'More breathing room' },
    { label: 'Balanced', value: 'balanced', description: 'Default spacing' },
    { label: 'Compact', value: 'compact', description: 'Fit more content' },
    { label: 'Dense', value: 'dense', description: 'Maximum content' },
  ],
  titleStyles: [
    { label: 'Normal', value: 'normal' },
    { label: 'Italic', value: 'italic' },
    { label: 'Uppercase', value: 'uppercase' },
  ],
  locationStyles: [
    { label: 'Inline', value: 'inline', description: 'Same line as company' },
    { label: 'Separate Line', value: 'below', description: 'Own line below' },
    { label: 'Right Side', value: 'right', description: 'Aligned to right' },
  ],
  experienceStyles: [
    { label: 'Position First', value: 'position-first', description: 'Job title prominent' },
    { label: 'Company First', value: 'company-first', description: 'Company prominent' },
  ],
  skillProficiencyStyles: [
    { label: 'None', value: 'none', description: 'Plain skill list' },
    { label: 'Level', value: 'level', description: 'Expert, Advanced, etc.' },
    { label: 'Years', value: 'years', description: '5+ years, 3 years, etc.' },
  ],
  sectionAlignments: [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
  ],
};
