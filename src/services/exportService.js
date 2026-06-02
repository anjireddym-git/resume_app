import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { DEFAULT_SECTION_ORDER, SECTION_LABELS } from '../config/templates';
import { DEFAULT_THEME_CONFIG } from '../config/themeConfig';
import { formatDate, formatDateRange as formatDateRangeValue } from '../lib/dateUtils';
import { getSummaryPoints } from '../lib/summaryUtils';

const PAGE_WIDTH_TWIPS = 12240;
const PAGE_HEIGHT_TWIPS = 15840;
const DEFAULT_MARGIN_TWIPS = 1440;
const BULLET_REFERENCE = 'resume-bullets';
const LEADING_LIST_MARKER_PATTERN = /^\s*(?:(?:[•*\-–—]+|\d+[.)])\s*)+/;
const PT = (pt) => Math.round(Number(pt || 0) * 2);
const TWIPS = (pt) => Math.round(Number(pt || 0) * 20);

const FONT_MAP = {
  Helvetica: 'Arial',
  'Times-Roman': 'Times New Roman',
  Courier: 'Courier New',
  Georgia: 'Georgia',
};

const DEFAULT_COLORS = {
  text: '#000000',
  secondary: '#434343',
  accent: '#1155CC',
  border: '#000000',
  sectionTitleColor: '#000000',
};

function stripHash(value, fallback = '000000') {
  const color = String(value || fallback).replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : fallback.replace('#', '').toUpperCase();
}

function coerceNumber(value, fallback, min, max) {
  const n = Number(value);
  const next = Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, next));
}

function normalizeFontFamily(fontFamily) {
  return FONT_MAP[fontFamily] || fontFamily || 'Arial';
}

function mergeTheme(themeConfig = {}) {
  return {
    ...DEFAULT_THEME_CONFIG,
    ...themeConfig,
    typography: { ...DEFAULT_THEME_CONFIG.typography, ...(themeConfig.typography || {}) },
    spacing: { ...DEFAULT_THEME_CONFIG.spacing, ...(themeConfig.spacing || {}) },
    colors: { ...DEFAULT_THEME_CONFIG.colors, ...(themeConfig.colors || {}) },
    header: { ...DEFAULT_THEME_CONFIG.header, ...(themeConfig.header || {}) },
    sectionTitle: { ...DEFAULT_THEME_CONFIG.sectionTitle, ...(themeConfig.sectionTitle || {}) },
    content: { ...DEFAULT_THEME_CONFIG.content, ...(themeConfig.content || {}) },
    experience: { ...DEFAULT_THEME_CONFIG.experience, ...(themeConfig.experience || {}) },
    ats: { ...DEFAULT_THEME_CONFIG.ats, ...(themeConfig.ats || {}) },
  };
}

function resolveDocxTheme(themeConfig) {
  const theme = mergeTheme(themeConfig);
  const fontSizePt = coerceNumber(theme.typography.fontSize, 11, 7, 14);
  const lineHeight = coerceNumber(theme.typography.lineHeight, 1.15, 1, 2);
  const marginScale = coerceNumber(theme.spacing.marginScale, 1, 0.75, 1.5);
  const marginPt = coerceNumber(coerceNumber(theme.spacing.pagePadding, 72, 20, 90) * marginScale, 20, 20, 100);
  const marginTwips = TWIPS(marginPt) || DEFAULT_MARGIN_TWIPS;
  const contentWidthTwips = PAGE_WIDTH_TWIPS - marginTwips * 2;
  const fontFamily = normalizeFontFamily(theme.typography.fontFamily);
  const headingScale = coerceNumber(theme.typography.headingScale, 1.2, 1, 1.8);
  const nameScale = coerceNumber(theme.typography.nameScale, 2.2, 1.5, 3);
  const bodyCharacterSpacing = Math.round(coerceNumber(theme.typography.letterSpacing, 0, 0, 3) * 20);
  const colors = {
    text: stripHash(theme.colors.text, DEFAULT_COLORS.text),
    secondary: stripHash(theme.colors.secondary, DEFAULT_COLORS.secondary),
    accent: stripHash(theme.colors.accent, DEFAULT_COLORS.accent),
    border: stripHash(theme.colors.border, DEFAULT_COLORS.border),
    sectionTitle: stripHash(theme.colors.sectionTitleColor, theme.colors.text || DEFAULT_COLORS.sectionTitleColor),
    background: stripHash(theme.colors.background, 'FFFFFF'),
  };
  const bulletColorKey = theme.content.bulletColor || 'text';

  return {
    raw: theme,
    fontFamily,
    bodySize: PT(fontSizePt),
    smallSize: PT(Math.max(7, fontSizePt - 1)),
    tinySize: PT(Math.max(7, fontSizePt - 1.5)),
    itemTitleSize: PT(Math.max(fontSizePt, fontSizePt + 0.5)),
    nameSize: PT(fontSizePt * nameScale),
    sectionTitleSize: PT(fontSizePt * headingScale),
    bodyCharacterSpacing,
    line: Math.round(lineHeight * 240),
    marginTwips,
    contentWidthTwips,
    sectionGap: TWIPS(coerceNumber(theme.spacing.sectionMargin, 12, 2, 28)),
    itemGap: TWIPS(coerceNumber(theme.spacing.itemMargin, 8, 1, 18)),
    bulletGap: TWIPS(coerceNumber(theme.spacing.itemMargin / 2, 4, 1, 10)),
    colors,
    bulletColor: colors[bulletColorKey] || colors.text,
    contactSeparator: ` ${theme.header.contactSeparator || '|'} `,
    bulletSymbol: theme.content.bulletStyle || '•',
    dateFormat: theme.content.dateFormat || 'MMM YYYY',
  };
}

function normalizeRenderOptions(resumeData, optionsOrSectionOrder) {
  const isLegacySectionOrder = Array.isArray(optionsOrSectionOrder);
  const options = isLegacySectionOrder ? { sectionOrder: optionsOrSectionOrder } : (optionsOrSectionOrder || {});
  const resumeTheme = resumeData?.themeConfig || {};
  const sectionOrder = options.sectionOrder || DEFAULT_SECTION_ORDER;
  const visibleSet = Array.isArray(options.visibleSections) ? new Set(options.visibleSections) : null;
  const customSectionDefs = options.customSectionDefs || resumeData?.customSectionDefs || [];
  const customIds = customSectionDefs.map((section) => section.id).filter(Boolean);
  const order = [...sectionOrder, ...customIds.filter((id) => !sectionOrder.includes(id))]
    .filter((id) => !visibleSet || visibleSet.has(id));

  return {
    sectionOrder: order,
    theme: resolveDocxTheme(options.themeConfig || resumeTheme),
    sectionFormats: {
      ...(resumeData?.sectionFormats || {}),
      ...(options.sectionFormats || {}),
    },
    customSectionDefs,
  };
}

function paragraphText(text, theme, overrides = {}) {
  return new TextRun({
    text: String(text ?? ''),
    font: theme.fontFamily,
    size: overrides.size || theme.bodySize,
    color: overrides.color || theme.colors.text,
    bold: overrides.bold || false,
    italics: overrides.italic || false,
    allCaps: overrides.allCaps || false,
    characterSpacing: overrides.characterSpacing ?? theme.bodyCharacterSpacing,
    underline: overrides.underline,
  });
}

function makeParagraph(children, theme, options = {}) {
  return new Paragraph({
    children,
    alignment: options.alignment,
    spacing: {
      before: options.before || 0,
      after: options.after ?? TWIPS(3),
      line: options.line || theme.line,
    },
    indent: options.indent,
    tabStops: options.tabStops,
    border: options.border,
    numbering: options.numbering,
    keepNext: options.keepNext,
    keepLines: options.keepLines,
    widowControl: true,
  });
}

function cleanListItemText(text) {
  return String(text ?? '').replace(LEADING_LIST_MARKER_PATTERN, '').trim();
}

function listItems(items = []) {
  return items.map(cleanListItemText).filter(Boolean);
}

function blankLine(theme, after = TWIPS(4)) {
  return makeParagraph([paragraphText('', theme)], theme, { after });
}

function borderForSection(theme) {
  const borderWidth = Math.max(4, Math.round((theme.raw.sectionTitle.borderWidth || 0.5) * 8));
  const common = {
    color: theme.colors.border,
    space: 2,
    size: borderWidth,
    style: BorderStyle.SINGLE,
  };
  switch (theme.raw.sectionTitle.border) {
    case 'none':
      return undefined;
    case 'double':
      return { bottom: { ...common, style: BorderStyle.DOUBLE } };
    case 'thick':
      return { bottom: { ...common, size: Math.max(10, borderWidth * 2) } };
    case 'top-bottom':
      return { top: common, bottom: common };
    case 'dotted':
      return { bottom: { ...common, style: BorderStyle.DOTTED } };
    case 'accent-left':
      return { left: { ...common, size: Math.max(10, borderWidth * 2) } };
    case 'bottom':
    default:
      return { bottom: common };
  }
}

function sectionTitle(text, theme) {
  const sectionStyle = theme.raw.sectionTitle || {};
  const align = sectionStyle.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;
  return makeParagraph(
    [
      paragraphText(text, theme, {
        bold: sectionStyle.bold !== false,
        allCaps: sectionStyle.uppercase !== false,
        color: theme.colors.sectionTitle,
        size: theme.sectionTitleSize,
        characterSpacing: Math.round(coerceNumber(sectionStyle.letterSpacing, 0, 0, 4) * 20),
      }),
    ],
    theme,
    {
      alignment: align,
      before: TWIPS(coerceNumber(sectionStyle.spacingTop, theme.raw.spacing.sectionMargin, 0, 28)),
      after: TWIPS(4),
      border: borderForSection(theme),
      keepNext: true,
    }
  );
}

function nameHeader(personal, theme) {
  const header = theme.raw.header || {};
  const alignment = header.layout === 'centered' ? AlignmentType.CENTER : AlignmentType.LEFT;
  return makeParagraph(
    nameHeaderChildren(personal, theme),
    theme,
    {
      alignment,
      after: TWIPS(3),
      border: nameDividerBorder(theme),
    }
  );
}

function nameHeaderChildren(personal, theme) {
  const header = theme.raw.header || {};
  const name = personal.name || 'Your Name';
  const displayName = header.nameUppercase ? name.toUpperCase() : name;
  return [
    paragraphText(displayName, theme, {
      bold: header.nameBold !== false,
      color: theme.colors.text,
      size: theme.nameSize,
      characterSpacing: Math.round(coerceNumber(header.nameLetterSpacing, 0, 0, 4) * 20),
    }),
  ];
}

function nameDividerBorder(theme) {
  return theme.raw.header?.nameDivider
    ? { bottom: { color: theme.colors.border, space: 2, size: 6, style: BorderStyle.SINGLE } }
    : undefined;
}

function titleLine(personal, theme, alignment) {
  const title = personal.title;
  if (!title) return null;
  const titleStyle = theme.raw.header?.titleStyle || 'normal';
  const displayTitle = titleStyle === 'uppercase' ? String(title).toUpperCase() : String(title);
  return makeParagraph(
    [
      paragraphText(displayTitle, theme, {
        color: theme.colors.secondary,
        size: theme.bodySize,
        italic: titleStyle === 'italic',
        characterSpacing: Math.round(coerceNumber(theme.raw.typography?.letterSpacing, 0, 0, 3) * 20),
      }),
    ],
    theme,
    { alignment, after: TWIPS(3) }
  );
}

function contactChildren(personal, theme) {
  const parts = [personal.location, personal.phone, personal.email, personal.linkedin, personal.github].filter(Boolean);
  const children = [];
  parts.forEach((part, index) => {
    if (index > 0) children.push(paragraphText(theme.contactSeparator, theme, { color: theme.colors.secondary, size: theme.smallSize }));
    children.push(paragraphText(part, theme, {
      color: String(part).includes('@') || String(part).startsWith('http') ? theme.colors.accent : theme.colors.secondary,
      size: theme.smallSize,
    }));
  });
  return children;
}

function contactLine(personal, theme) {
  const children = contactChildren(personal, theme);
  if (!children.length) return null;
  const alignment = theme.raw.header?.layout === 'centered' ? AlignmentType.CENTER : AlignmentType.LEFT;
  return makeParagraph(children, theme, { alignment, after: TWIPS(8) });
}

function itemHeader({ left, right, theme, leftBold = true }) {
  const children = [];
  if (Array.isArray(left)) {
    left.forEach((part) => {
      children.push(paragraphText(part.text, theme, {
        bold: part.bold || false,
        color: part.color || theme.colors.text,
        size: part.size || theme.itemTitleSize,
        italic: part.italic || false,
      }));
    });
  } else {
    children.push(paragraphText(left || '', theme, { bold: leftBold, size: theme.itemTitleSize }));
  }

  const dateAlign = theme.raw.content?.dateAlign || 'right';
  if (right && dateAlign === 'inline') {
    children.push(paragraphText('  |  ', theme, { color: theme.colors.secondary, size: theme.smallSize }));
    children.push(paragraphText(right, theme, { color: theme.colors.secondary, size: theme.smallSize }));
  } else if (right && dateAlign !== 'below') {
    children.push(paragraphText('\t', theme, { size: theme.smallSize }));
    children.push(paragraphText(right, theme, { color: theme.colors.secondary, size: theme.smallSize }));
  }

  const paragraphs = [
    makeParagraph(children, theme, {
      after: TWIPS(2),
      tabStops: right && dateAlign !== 'below' && dateAlign !== 'inline'
        ? [{ type: TabStopType.RIGHT, position: theme.contentWidthTwips }]
        : undefined,
      keepNext: true,
      keepLines: true,
    }),
  ];

  if (right && dateAlign === 'below') {
    paragraphs.push(makeParagraph([paragraphText(right, theme, { color: theme.colors.secondary, size: theme.smallSize })], theme, { after: TWIPS(2) }));
  }
  return paragraphs;
}

function bullet(text, theme) {
  return makeParagraph(
    [paragraphText(cleanListItemText(text), theme)],
    theme,
    {
      after: theme.bulletGap,
      numbering: { reference: BULLET_REFERENCE, level: 0 },
    }
  );
}

function plain(text, theme, options = {}) {
  return makeParagraph(
    [paragraphText(text || '', theme, options)],
    theme,
    {
      after: options.after ?? TWIPS(4),
      before: options.before || 0,
    }
  );
}

function formatSkillLabel(key) {
  const s = String(key || '').replace(/[-_]+/g, ' ').trim();
  if (/\s|[A-Z]/.test(s)) return s;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateRange(start, end, theme) {
  return formatDateRangeValue(start, end || (start ? 'Present' : ''), theme.dateFormat);
}

function renderHeader(paragraphs, resumeData, theme) {
  const personal = resumeData.personalInfo || {};
  const headerLayout = theme.raw.header?.layout || 'centered';

  if (headerLayout === 'twoColumn') {
    const children = [...nameHeaderChildren(personal, theme)];
    const contact = contactChildren(personal, theme);
    if (contact.length) {
      children.push(paragraphText('\t', theme, { size: theme.smallSize }));
      children.push(...contact);
    }
    paragraphs.push(makeParagraph(children, theme, {
      alignment: AlignmentType.LEFT,
      after: TWIPS(3),
      border: nameDividerBorder(theme),
      tabStops: contact.length ? [{ type: TabStopType.RIGHT, position: theme.contentWidthTwips }] : undefined,
    }));
    const title = titleLine(personal, theme, AlignmentType.LEFT);
    if (title) paragraphs.push(title);
    paragraphs.push(blankLine(theme, TWIPS(4)));
    return;
  }

  const alignment = headerLayout === 'centered' ? AlignmentType.CENTER : AlignmentType.LEFT;
  paragraphs.push(nameHeader(personal, theme));
  const title = titleLine(personal, theme, alignment);
  if (title) paragraphs.push(title);
  const contact = contactLine(personal, theme);
  if (contact) paragraphs.push(contact);
}

function renderSummary(paragraphs, resumeData, theme) {
  const points = getSummaryPoints(resumeData.summary || '');
  if (!points.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.summary, theme));
  points.forEach((point) => paragraphs.push(bullet(point, theme)));
  paragraphs.push(blankLine(theme, Math.max(TWIPS(2), theme.sectionGap / 2)));
}

function getSkillCategories(skills = {}) {
  return Object.entries(skills)
    .filter(([, items]) => Array.isArray(items))
    .map(([key, items]) => ({
      label: formatSkillLabel(key),
      values: items.filter((item) => item && String(item).trim()),
    }))
    .filter((category) => category.values.length > 0);
}

function renderSkills(paragraphs, resumeData, theme, format = 'categorized') {
  const categories = getSkillCategories(resumeData.skills || {});
  if (!categories.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.skills, theme));

  if (format === 'inline') {
    const values = categories.flatMap((category) => category.values);
    paragraphs.push(plain(values.join('  •  '), theme));
  } else if (format === 'two-column') {
    for (let i = 0; i < categories.length; i += 2) {
      const left = categories[i];
      const right = categories[i + 1];
      const children = [
        paragraphText(`${left.label}: `, theme, { bold: true }),
        paragraphText(left.values.join('  •  '), theme),
      ];
      if (right) {
        children.push(paragraphText('\t', theme));
        children.push(paragraphText(`${right.label}: `, theme, { bold: true }));
        children.push(paragraphText(right.values.join('  •  '), theme));
      }
      paragraphs.push(makeParagraph(children, theme, {
        after: TWIPS(4),
        tabStops: [{ type: TabStopType.LEFT, position: Math.round(theme.contentWidthTwips / 2) }],
      }));
    }
  } else {
    categories.forEach(({ label, values }) => {
      paragraphs.push(makeParagraph([
        paragraphText(`${label}:  `, theme, { bold: true }),
        paragraphText(values.join(format === 'tags' ? '  •  ' : '  •  '), theme),
      ], theme, { after: TWIPS(4) }));
    });
  }
  paragraphs.push(blankLine(theme, Math.max(TWIPS(2), theme.sectionGap / 2)));
}

function renderExperience(paragraphs, resumeData, theme, format = 'detailed') {
  if (!resumeData.experience?.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.experience, theme));
  resumeData.experience.forEach((exp) => {
    const companyFirst = theme.raw.experience?.titlePosition === 'company-first' || theme.raw.content?.companyFirst;
    const showLocation = exp.location && theme.raw.content?.showLocation !== false;
    const locationPlacement = theme.raw.experience?.locationPlacement || theme.raw.content?.locationStyle || 'inline';
    const dateText = formatDateRange(exp.startDate, exp.endDate, theme);
    const primary = companyFirst ? (exp.company || exp.position || 'Role') : (exp.position || exp.company || 'Role');
    const secondary = companyFirst ? exp.position : exp.company;
    const leftParts = [
      { text: primary, bold: true, color: theme.colors.text },
    ];
    if (secondary) leftParts.push({ text: `  |  ${secondary}`, color: theme.colors.secondary });
    if (showLocation && locationPlacement === 'inline') {
      leftParts.push({ text: `  |  ${exp.location}`, color: theme.colors.secondary, size: theme.smallSize });
    }
    const rightParts = [dateText];
    if (showLocation && locationPlacement === 'right') rightParts.push(exp.location);
    paragraphs.push(...itemHeader({ left: leftParts, right: rightParts.filter(Boolean).join('  |  '), theme }));
    if (showLocation && (locationPlacement === 'below' || locationPlacement === 'separate')) {
      paragraphs.push(plain(exp.location, theme, { color: theme.colors.secondary, size: theme.smallSize, after: TWIPS(2) }));
    }
    if (format !== 'compact' && theme.raw.experience?.highlightBullets !== false) {
      listItems(exp.highlights || []).forEach((highlight) => paragraphs.push(bullet(highlight, theme)));
    } else if (listItems(exp.highlights || []).length) {
      paragraphs.push(plain(listItems(exp.highlights || []).join(' '), theme, { after: TWIPS(3) }));
    }
    if (exp.environment) {
      paragraphs.push(plain(`Environment: ${exp.environment}`, theme, { color: theme.colors.secondary, size: theme.tinySize, italic: true, after: TWIPS(3) }));
    }
    paragraphs.push(blankLine(theme, theme.itemGap));
  });
}

function renderInternships(paragraphs, resumeData, theme, format = 'detailed') {
  if (!resumeData.internships?.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.internships, theme));
  resumeData.internships.forEach((intern) => {
    const leftParts = [{ text: intern.position || 'Intern', bold: true }];
    if (intern.company) leftParts.push({ text: `  |  ${intern.company}`, color: theme.colors.secondary });
    const dateStr = intern.duration || formatDateRange(intern.startDate, intern.endDate, theme);
    paragraphs.push(...itemHeader({ left: leftParts, right: dateStr, theme }));
    if (format !== 'compact') {
      listItems(intern.highlights || []).forEach((highlight) => paragraphs.push(bullet(highlight, theme)));
    }
    paragraphs.push(blankLine(theme, theme.itemGap));
  });
}

function renderEducation(paragraphs, resumeData, theme, format = 'detailed') {
  if (!resumeData.education?.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.education, theme));
  resumeData.education.forEach((edu) => {
    const degreeText = [edu.degree, edu.field ? `in ${edu.field}` : null].filter(Boolean).join(' ') || 'Degree';
    paragraphs.push(...itemHeader({
      left: degreeText,
      right: formatDate(edu.graduationDate, theme.dateFormat),
      theme,
    }));
    const meta = [edu.institution, edu.location, edu.gpa ? `GPA: ${edu.gpa}` : null].filter(Boolean).join('  |  ');
    if (meta && format !== 'compact') {
      paragraphs.push(plain(meta, theme, { color: theme.colors.secondary, after: TWIPS(4) }));
    }
  });
  paragraphs.push(blankLine(theme, Math.max(TWIPS(2), theme.sectionGap / 2)));
}

function renderProjects(paragraphs, resumeData, theme, format = 'detailed') {
  if (!resumeData.projects?.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.projects, theme));
  resumeData.projects.forEach((project) => {
    paragraphs.push(...itemHeader({ left: project.name || 'Project', right: project.date || '', theme }));
    if (project.link) paragraphs.push(plain(project.link, theme, { color: theme.colors.accent, after: TWIPS(3) }));
    if (project.technologies?.length) paragraphs.push(plain(project.technologies.join('  •  '), theme, { color: theme.colors.secondary, size: theme.smallSize, after: TWIPS(3) }));
    if (format !== 'compact') {
      if (project.description) paragraphs.push(plain(project.description, theme, { after: TWIPS(3) }));
      listItems(project.highlights || []).forEach((highlight) => paragraphs.push(bullet(highlight, theme)));
    }
    paragraphs.push(blankLine(theme, theme.itemGap));
  });
}

function renderCertifications(paragraphs, resumeData, theme, format = 'list') {
  if (!resumeData.certifications?.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.certifications, theme));
  const items = resumeData.certifications.map((cert) => [cert.name, cert.issuer ? `- ${cert.issuer}` : null, cert.date ? `(${cert.date})` : null].filter(Boolean).join(' '));
  if (format === 'inline') {
    paragraphs.push(plain(items.join('  •  '), theme));
  } else {
    items.forEach((item) => paragraphs.push(bullet(item, theme)));
  }
  paragraphs.push(blankLine(theme, Math.max(TWIPS(2), theme.sectionGap / 2)));
}

function renderHackathons(paragraphs, resumeData, theme, format = 'list') {
  if (!resumeData.hackathons?.length) return;
  paragraphs.push(sectionTitle(SECTION_LABELS.hackathons, theme));
  const items = resumeData.hackathons.map((hack) => [hack.name, hack.description ? `- ${hack.description}` : null, hack.date ? `(${hack.date})` : null].filter(Boolean).join(' '));
  if (format === 'inline') {
    paragraphs.push(plain(items.join('  •  '), theme));
  } else {
    items.forEach((item) => paragraphs.push(bullet(item, theme)));
  }
  paragraphs.push(blankLine(theme, Math.max(TWIPS(2), theme.sectionGap / 2)));
}

function renderCustomSection(paragraphs, resumeData, sectionDef, theme) {
  const content = resumeData.customSections?.[sectionDef.id];
  if (!content || !String(content).trim()) return;
  paragraphs.push(sectionTitle(sectionDef.title || sectionDef.id, theme));
  String(content)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        paragraphs.push(bullet(bulletMatch[1], theme));
      } else {
        paragraphs.push(plain(line, theme));
      }
    });
  paragraphs.push(blankLine(theme, Math.max(TWIPS(2), theme.sectionGap / 2)));
}

const renderers = {
  summary: renderSummary,
  skills: renderSkills,
  experience: renderExperience,
  internships: renderInternships,
  education: renderEducation,
  projects: renderProjects,
  certifications: renderCertifications,
  hackathons: renderHackathons,
};

export function getDocxRenderOptions(resumeData, optionsOrSectionOrder) {
  return normalizeRenderOptions(resumeData, optionsOrSectionOrder);
}

export const generateDocxBlob = async (resumeData, optionsOrSectionOrder) => {
  if (!resumeData) throw new Error('Resume data not found');

  const { sectionOrder, theme, sectionFormats, customSectionDefs } = normalizeRenderOptions(resumeData, optionsOrSectionOrder);
  const customDefById = new Map(customSectionDefs.map((section) => [section.id, section]));
  const paragraphs = [];

  renderHeader(paragraphs, resumeData, theme);

  for (const sectionId of sectionOrder) {
    const renderer = renderers[sectionId];
    if (renderer) {
      renderer(paragraphs, resumeData, theme, sectionFormats[sectionId]);
    } else if (customDefById.has(sectionId)) {
      renderCustomSection(paragraphs, resumeData, customDefById.get(sectionId), theme);
    }
  }

  const doc = new Document({
    creator: 'Resume Updater',
    title: resumeData.personalInfo?.name || 'Resume',
    styles: {
      default: {
        document: {
          run: {
            font: theme.fontFamily,
            size: theme.bodySize,
            color: theme.colors.text,
          },
          paragraph: {
            spacing: { line: theme.line, after: TWIPS(3) },
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          quickFormat: true,
          run: { font: theme.fontFamily, size: theme.bodySize, color: theme.colors.text },
          paragraph: { spacing: { line: theme.line } },
        },
        {
          id: 'ListParagraph',
          name: 'List Paragraph',
          basedOn: 'Normal',
          run: { font: theme.fontFamily, size: theme.bodySize, color: theme.colors.text },
          paragraph: { spacing: { line: theme.line } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: BULLET_REFERENCE,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: theme.bulletSymbol,
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 360, hanging: 180 },
                  spacing: { line: theme.line },
                },
                run: {
                  font: theme.fontFamily,
                  color: theme.bulletColor,
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_TWIPS, height: PAGE_HEIGHT_TWIPS },
            margin: {
              top: theme.marginTwips,
              right: theme.marginTwips,
              bottom: theme.marginTwips,
              left: theme.marginTwips,
            },
          },
        },
        children: paragraphs.length ? paragraphs : [plain('Resume content is empty.', theme)],
      },
    ],
  });

  return Packer.toBlob(doc);
};

export const exportToDOCX = async (resumeData, fileName = 'resume.docx', optionsOrSectionOrder) => {
  const blob = await generateDocxBlob(resumeData, optionsOrSectionOrder);
  saveAs(blob, fileName);
};
