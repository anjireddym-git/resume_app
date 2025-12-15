export const DEFAULT_THEME_CONFIG = {
  // Typography
  typography: {
    fontFamily: 'Helvetica', // Helvetica, Times-Roman, Courier
    fontSize: 10, // Base font size
    lineHeight: 1.4,
    headingScale: 1.2, // Multiplier for section headers
    nameScale: 2.2, // Multiplier for name
  },

  // Spacing & Layout
  spacing: {
    pagePadding: 40,
    sectionMargin: 12, // Space between sections
    itemMargin: 8, // Space between items (jobs)
    marginScale: 1.0, // Global multiplier for margins
  },

  // Colors
  colors: {
    text: '#1f2937', // Gray-800
    secondary: '#4b5563', // Gray-600 (dates, locations)
    accent: '#2563eb', // Primary brand color (links, maybe bullets)
    border: '#e5e7eb', // Gray-200
    background: '#ffffff',
  },

  // Header Styling
  header: {
    layout: 'centered', // centered, left, twoColumn
    nameBold: true,
    nameUppercase: false,
    contactSeparator: '|', // |, •, -, /
  },

  // Section Styling
  sectionTitle: {
    uppercase: true,
    bold: true,
    border: 'bottom', // none, bottom, full
    align: 'left', // left, center
  },

  // Content Styling
  content: {
    bulletStyle: '•', // •, -, >, *
    dateAlign: 'right', // right, below
    skillsStyle: 'grouped', // grouped, tags, list
  },
};

export const THEME_OPTIONS = {
  fonts: [
    { label: 'Modern (Sans)', value: 'Helvetica' },
    { label: 'Classic (Serif)', value: 'Times-Roman' },
    { label: 'Technical (Mono)', value: 'Courier' },
  ],
  headerLayouts: [
    { label: 'Centered', value: 'centered' },
    { label: 'Left Aligned', value: 'left' },
    { label: 'Two Column', value: 'twoColumn' },
  ],
  separators: [
    { label: 'Pipe (|)', value: '|' },
    { label: 'Bullet (•)', value: '•' },
    { label: 'Dash (-)', value: '-' },
  ],
  borders: [
    { label: 'Underline', value: 'bottom' },
    { label: 'None', value: 'none' },
  ],
};
