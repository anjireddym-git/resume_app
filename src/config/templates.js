// Template configuration - defines all available resume templates
// Each template has subtle variations in styling (spacing, borders, font sizes)

export const TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Section titles with underline border',
    styles: {
      page: {
        padding: 40,
        fontSize: 10,
      },
      sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      },
      section: {
        marginBottom: 12,
      },
      item: {
        marginBottom: 8,
      },
      name: {
        fontSize: 22,
      },
      jobTitle: {
        fontSize: 11,
      },
      body: {
        fontSize: 9,
        lineHeight: 1.4,
      },
    },
    webClasses: {
      sectionTitle: 'text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 pb-1 border-b-2 border-gray-200',
      name: 'text-3xl font-semibold text-gray-800 tracking-tight',
      section: 'mb-4',
      item: 'mb-3',
    },
  },
  
  clean: {
    id: 'clean',
    name: 'Clean',
    description: 'Section titles bold, no border',
    styles: {
      page: {
        padding: 40,
        fontSize: 10,
      },
      sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        paddingBottom: 0,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
      },
      section: {
        marginBottom: 14,
      },
      item: {
        marginBottom: 8,
      },
      name: {
        fontSize: 24,
      },
      jobTitle: {
        fontSize: 11,
      },
      body: {
        fontSize: 9,
        lineHeight: 1.5,
      },
    },
    webClasses: {
      sectionTitle: 'text-sm font-bold text-gray-800 uppercase tracking-wide mb-3',
      name: 'text-3xl font-bold text-gray-900 tracking-tight',
      section: 'mb-5',
      item: 'mb-3',
    },
  },
  
  compact: {
    id: 'compact',
    name: 'Compact',
    description: 'Tighter spacing, smaller fonts',
    styles: {
      page: {
        padding: 32,
        fontSize: 9,
      },
      sectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
        paddingBottom: 2,
        borderBottomWidth: 0.5,
        borderBottomColor: '#d1d5db',
      },
      section: {
        marginBottom: 8,
      },
      item: {
        marginBottom: 5,
      },
      name: {
        fontSize: 20,
      },
      jobTitle: {
        fontSize: 10,
      },
      body: {
        fontSize: 8,
        lineHeight: 1.35,
      },
    },
    webClasses: {
      sectionTitle: 'text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 pb-0.5 border-b border-gray-200',
      name: 'text-2xl font-semibold text-gray-800 tracking-tight',
      section: 'mb-3',
      item: 'mb-2',
    },
  },
};

// Default section order
export const DEFAULT_SECTION_ORDER = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'internships',
  'hackathons',
];

export const SECTION_LABELS = {
  summary: 'Summary',
  skills: 'Technical Skills',
  experience: 'Professional Experience',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
  internships: 'Internships',
  hackathons: 'Hackathons & Awards',
};

export default TEMPLATES;
