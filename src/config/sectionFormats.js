// Section format configurations
// Each section can have multiple display formats

export const SECTION_FORMATS = {
  summary: {
    label: 'Summary',
    formats: {
      paragraph: { id: 'paragraph', label: 'Paragraph', icon: 'AlignLeft', description: 'Single flowing paragraph' },
      points: { id: 'points', label: 'Bullet Points', icon: 'List', description: 'List of key points' },
    },
    default: 'paragraph',
  },
  
  skills: {
    label: 'Skills',
    formats: {
      categorized: { id: 'categorized', label: 'Categorized', icon: 'LayoutList', description: 'Category: skills' },
      tags: { id: 'tags', label: 'Tags', icon: 'Tags', description: 'Badge-style skills' },
      inline: { id: 'inline', label: 'Inline', icon: 'AlignJustify', description: 'All skills bullet-separated' },
      'grouped-inline': { id: 'grouped-inline', label: 'Grouped', icon: 'Rows3', description: 'Categories with bullets' },
      'two-column': { id: 'two-column', label: 'Columns', icon: 'Columns2', description: '2-column layout' },
    },
    default: 'categorized',
  },
  
  experience: {
    label: 'Experience',
    formats: {
      detailed: { id: 'detailed', label: 'Detailed', icon: 'FileText', description: 'Full bullets with dates' },
      compact: { id: 'compact', label: 'Compact', icon: 'AlignJustify', description: 'One-liner per role' },
    },
    default: 'detailed',
  },
  
  education: {
    label: 'Education',
    formats: {
      detailed: { id: 'detailed', label: 'Detailed', icon: 'FileText', description: 'Full with GPA, highlights' },
      compact: { id: 'compact', label: 'Compact', icon: 'AlignJustify', description: 'One line per degree' },
    },
    default: 'detailed',
  },
  
  projects: {
    label: 'Projects',
    formats: {
      detailed: { id: 'detailed', label: 'Detailed', icon: 'FileText', description: 'Full project cards' },
      compact: { id: 'compact', label: 'Compact', icon: 'AlignJustify', description: 'Title + tech stack only' },
    },
    default: 'detailed',
  },
  
  certifications: {
    label: 'Certifications',
    formats: {
      list: { id: 'list', label: 'List', icon: 'List', description: 'Name • Issuer • Date' },
      inline: { id: 'inline', label: 'Inline', icon: 'AlignJustify', description: 'All on one line' },
    },
    default: 'list',
  },
  
  internships: {
    label: 'Internships',
    formats: {
      detailed: { id: 'detailed', label: 'Detailed', icon: 'FileText', description: 'Full with bullets' },
      compact: { id: 'compact', label: 'Compact', icon: 'AlignJustify', description: 'One line per internship' },
    },
    default: 'detailed',
  },
  
  hackathons: {
    label: 'Hackathons',
    formats: {
      list: { id: 'list', label: 'List', icon: 'List', description: 'Name + description + date' },
      inline: { id: 'inline', label: 'Inline', icon: 'AlignJustify', description: 'All on one line' },
    },
    default: 'list',
  },
  
  header: {
    label: 'Header',
    formats: {
      centered: { id: 'centered', label: 'Centered', icon: 'AlignCenter', description: 'Name centered, contact below' },
      leftAligned: { id: 'leftAligned', label: 'Left Aligned', icon: 'AlignLeft', description: 'All left-aligned' },
      twoColumn: { id: 'twoColumn', label: 'Two Column', icon: 'Columns2', description: 'Name left, contact right' },
    },
    default: 'centered',
  },
};

// Default format settings for a new resume
export const getDefaultFormats = () => {
  const defaults = {};
  Object.keys(SECTION_FORMATS).forEach(section => {
    defaults[section] = SECTION_FORMATS[section].default;
  });
  return defaults;
};

export default SECTION_FORMATS;
