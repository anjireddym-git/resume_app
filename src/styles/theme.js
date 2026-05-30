// Shared styling configuration for both web and PDF rendering
// This is the single source of truth for all visual styles

export const colors = {
  // Text colors
  text: {
    primary: '#1f2937',    // slate-800
    secondary: '#4b5563',  // gray-600
    muted: '#6b7280',      // gray-500
    light: '#9ca3af',      // gray-400
  },
  // Accent colors
  accent: {
    primary: '#2563eb',    // blue-600
    success: '#059669',    // emerald-600
  },
  // Border colors
  border: {
    light: '#e5e7eb',      // gray-200
    medium: '#d1d5db',     // gray-300
  },
  // Background colors
  background: {
    white: '#ffffff',
    muted: '#f3f4f6',      // gray-100
    accent: '#eff6ff',     // blue-50
  }
};

export const fonts = {
  primary: 'Helvetica',
  fallback: 'Arial, sans-serif',
  sizes: {
    name: 22,
    sectionTitle: 10,
    jobTitle: 11,
    body: 10,
    small: 9,
    tiny: 8,
  }
};

export const spacing = {
  page: {
    margin: 40,
    width: 612,  // Letter size in points (8.5in)
    height: 792, // Letter size in points (11in)
  },
  section: {
    marginBottom: 12,
    titleMarginBottom: 6,
  },
  item: {
    marginBottom: 8,
  },
  bullet: {
    indent: 16,
    gap: 4,
  }
};

// Tailwind class mappings for web components — Google Docs–native style
export const webClasses = {
  text: {
    primary: 'text-black',
    secondary: 'text-neutral-700',
    muted: 'text-neutral-600',
    light: 'text-neutral-500',
  },
  accent: {
    primary: 'text-[#1155CC]',
    success: 'text-emerald-700',
  },
  // Section title: Docs-style — 12pt black uppercase, light underline
  sectionTitle: 'text-[12pt] font-bold text-black uppercase tracking-[0.04em] mb-1.5 pb-0.5 border-b border-neutral-800',
  // Candidate name: Docs Heading 1 (20pt)
  name: 'text-[20pt] font-bold text-black leading-tight',
  jobTitle: 'font-bold text-black',
  body: 'text-[11pt] text-black',
  small: 'text-[10pt] text-neutral-700',
};

// @react-pdf/renderer StyleSheet format
export const pdfStyles = {
  page: {
    padding: spacing.page.margin,
    fontSize: fonts.sizes.body,
    fontFamily: fonts.primary,
    color: colors.text.primary,
    lineHeight: 1.5,
  },
  name: {
    fontSize: fonts.sizes.name,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: fonts.sizes.sectionTitle,
    fontWeight: 'bold',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.section.titleMarginBottom,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  section: {
    marginBottom: spacing.section.marginBottom,
  },
  itemTitle: {
    fontSize: fonts.sizes.jobTitle,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  itemSubtitle: {
    fontSize: fonts.sizes.body,
    color: colors.text.muted,
  },
  body: {
    fontSize: fonts.sizes.body,
    color: colors.text.primary,
  },
  bulletList: {
    marginTop: 3,
    paddingLeft: spacing.bullet.indent,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bullet: {
    fontSize: fonts.sizes.small,
    color: colors.accent.primary,
    marginRight: spacing.bullet.gap,
  },
  bulletText: {
    fontSize: fonts.sizes.small,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 1.4,
  },
  link: {
    color: colors.accent.primary,
    textDecoration: 'none',
  },
  date: {
    fontSize: fonts.sizes.small,
    color: colors.text.light,
  },
  tag: {
    fontSize: fonts.sizes.tiny,
    color: colors.text.muted,
  }
};

export default {
  colors,
  fonts,
  spacing,
  webClasses,
  pdfStyles,
};
