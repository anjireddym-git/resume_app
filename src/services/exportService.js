import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
  TabStopType,
  AlignmentType,
  UnderlineType,
} from 'docx';
import { saveAs } from 'file-saver';
import { formatDate } from '../lib/dateUtils';
import { getSummaryPoints } from '../lib/summaryUtils';

// ─── Constants matching Google Docs default styling ─────────────────────────
// Letter page 8.5×11in = 12240×15840 twips. Docs default margins = 1in = 1440 twips.
const MARGIN = 1440; // 1 inch (Google Docs default)
const PAGE_WIDTH = 12240; // 8.5 inch letter
const CONTENT_WIDTH_TWIPS = PAGE_WIDTH - MARGIN * 2; // 9360 twips

const C = {
  dark:   '000000', // body text — pure black like Docs default
  mid:    '434343', // secondary — Docs default heading-3 grey
  muted:  '000000', // section titles in Docs style — black
  light:  'CCCCCC', // separators
  accent: '1155CC', // Docs default link blue
  border: '000000', // section title underline
  env:    '434343', // environment line
};

const PT = (pt) => pt * 2; // docx "half-points" = pt × 2

// ─── Helpers ────────────────────────────────────────────────────────────────

function sectionTitle(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        allCaps: true,
        color: C.muted,
        size: PT(9),
        characterSpacing: 80, // ~tracking-widest
      }),
    ],
    spacing: { before: 200, after: 100 },
    border: {
      bottom: { color: C.border, space: 2, size: 6, style: BorderStyle.SINGLE },
    },
    // Never let the section title sit alone at the bottom of a page
    keepNext: true,
  });
}

function nameHeader(name) {
  return new Paragraph({
    children: [new TextRun({ text: name || 'Your Name', bold: true, size: PT(22), color: C.dark })],
    spacing: { after: 60 },
  });
}

function contactLine(parts) {
  const filtered = parts.filter(Boolean);
  const children = [];
  filtered.forEach((part, i) => {
    if (i > 0) children.push(new TextRun({ text: '  •  ', color: C.light, size: PT(10) }));
    children.push(new TextRun({ text: part, color: C.muted, size: PT(10) }));
  });
  return new Paragraph({ children, spacing: { after: 0 } });
}

/** Single text line, optional right-aligned date via tab stop */
function itemHeader({ left, right, leftBold = true, leftSize = PT(10), rightSize = PT(9) }) {
  const children = [];
  if (Array.isArray(left)) {
    left.forEach(({ text, bold = false, color = C.dark, size = leftSize, italic = false }) => {
      children.push(new TextRun({ text, bold, color, size, italics: italic }));
    });
  } else {
    children.push(new TextRun({ text: left || '', bold: leftBold, color: C.dark, size: leftSize }));
  }
  if (right) {
    children.push(new TextRun({ text: '\t', size: rightSize }));
    children.push(new TextRun({ text: right, color: C.muted, size: rightSize }));
  }
  return new Paragraph({
    tabStops: right ? [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH_TWIPS }] : undefined,
    children,
    spacing: { before: 100, after: 40 },
    // Keep this header line with the content that follows it (no orphan headers)
    keepNext: true,
    keepLines: true,
  });
}

function bullet(text, size = PT(9)) {
  return new Paragraph({
    children: [new TextRun({ text: text || '', color: C.dark, size })],
    bullet: { level: 0 },
    spacing: { after: 60, line: 276 },
    widowControl: true,
  });
}

function plain(text, { color = C.dark, size = PT(9), bold = false, italic = false, after = 60 } = {}) {
  return new Paragraph({
    children: [new TextRun({ text: text || '', color, size, bold, italics: italic })],
    spacing: { after, line: 276 },
    widowControl: true,
  });
}

function spacer(after = 60) {
  return new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after } });
}

function formatSkillLabel(key) {
  return String(key || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = end ? formatDate(end) : 'Present';
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
}

// ─── Main export function ────────────────────────────────────────────────────

export const generateDocxBlob = async (resumeData, sectionOrder) => {
  if (!resumeData) throw new Error('Resume data not found');

  const personal = resumeData.personalInfo || {};

  // Default section order if not provided
  const order = sectionOrder || [
    'summary', 'skills', 'experience', 'internships',
    'education', 'projects', 'certifications', 'hackathons',
  ];

  const paragraphs = [];

  // ── Header ─────────────────────────────────────────────────────────────────
  paragraphs.push(nameHeader(personal.name));
  paragraphs.push(contactLine([
    personal.location,
    personal.phone,
    personal.email,
    personal.linkedin,
    personal.github,
  ]));
  paragraphs.push(spacer(120));

  // ── Sections (respects sectionOrder) ───────────────────────────────────────
  for (const section of order) {
    switch (section) {

      case 'summary': {
        const points = getSummaryPoints(resumeData.summary || '');
        if (!points.length) break;
        paragraphs.push(sectionTitle('Professional Summary'));
        points.forEach((p) => paragraphs.push(bullet(p)));
        paragraphs.push(spacer(80));
        break;
      }

      case 'skills': {
        const skills = resumeData.skills || {};
        const categories = Object.entries(skills)
          .filter(([, items]) => Array.isArray(items))
          .map(([key, items]) => ({
            label: formatSkillLabel(key),
            values: items.filter((i) => i && String(i).trim()),
          }))
          .filter((c) => c.values.length > 0);
        if (!categories.length) break;
        paragraphs.push(sectionTitle('Technical Skills'));
        categories.forEach(({ label, values }) => {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${label}:  `, bold: true, size: PT(9), color: C.dark }),
                new TextRun({ text: values.join('  •  '), size: PT(9), color: C.dark }),
              ],
              spacing: { after: 60, line: 276 },
            })
          );
        });
        paragraphs.push(spacer(80));
        break;
      }

      case 'experience': {
        if (!resumeData.experience?.length) break;
        paragraphs.push(sectionTitle('Professional Experience'));
        resumeData.experience.forEach((exp) => {
          // Title line: Position bold · Company muted                  Date
          const leftParts = [
            { text: exp.position || 'Role', bold: true, color: C.dark, size: PT(10) },
          ];
          if (exp.company) leftParts.push({ text: `  ·  ${exp.company}`, color: C.mid, size: PT(10) });
          if (exp.location) leftParts.push({ text: `  ·  ${exp.location}`, color: C.light, size: PT(9) });

          paragraphs.push(itemHeader({
            left: leftParts,
            right: formatDateRange(exp.startDate, exp.endDate),
          }));

          (exp.highlights || []).filter(Boolean).forEach((h) => paragraphs.push(bullet(h)));

          if (exp.environment) {
            paragraphs.push(plain(`Environment:  ${exp.environment}`, { color: C.env, size: PT(8.5), italic: true }));
          }
          paragraphs.push(spacer(60));
        });
        break;
      }

      case 'internships': {
        if (!resumeData.internships?.length) break;
        paragraphs.push(sectionTitle('Internships'));
        resumeData.internships.forEach((intern) => {
          const leftParts = [
            { text: intern.position || 'Intern', bold: true, color: C.dark, size: PT(10) },
          ];
          if (intern.company) leftParts.push({ text: `  ·  ${intern.company}`, color: C.mid, size: PT(10) });

          const dateStr = intern.duration || formatDateRange(intern.startDate, intern.endDate);
          paragraphs.push(itemHeader({ left: leftParts, right: dateStr }));
          (intern.highlights || []).filter(Boolean).forEach((h) => paragraphs.push(bullet(h)));
          paragraphs.push(spacer(60));
        });
        break;
      }

      case 'education': {
        if (!resumeData.education?.length) break;
        paragraphs.push(sectionTitle('Education'));
        resumeData.education.forEach((edu) => {
          const degreeText = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree;
          paragraphs.push(itemHeader({
            left: degreeText || 'Degree',
            right: formatDate(edu.graduationDate),
          }));

          const institutionParts = [
            { text: edu.institution || '', bold: false, color: C.mid, size: PT(9) },
          ];
          if (edu.location) institutionParts.push({ text: `  ·  ${edu.location}`, color: C.mid, size: PT(9) });
          if (edu.gpa) institutionParts.push({ text: `   GPA: ${edu.gpa}`, bold: true, color: '059669', size: PT(9) });

          paragraphs.push(new Paragraph({
            children: institutionParts.map((p) => new TextRun(p)),
            spacing: { after: 80 },
          }));
        });
        paragraphs.push(spacer(40));
        break;
      }

      case 'projects': {
        if (!resumeData.projects?.length) break;
        paragraphs.push(sectionTitle('Projects'));
        resumeData.projects.forEach((project) => {
          paragraphs.push(itemHeader({
            left: project.name || 'Project',
            right: project.date || '',
          }));

          if (project.link) {
            paragraphs.push(plain(project.link, { color: C.accent, size: PT(9) }));
          }
          if (project.technologies?.length) {
            paragraphs.push(plain(project.technologies.join('  •  '), { color: C.muted, size: PT(8.5) }));
          }
          if (project.description) {
            paragraphs.push(plain(project.description, { size: PT(9) }));
          }
          (project.highlights || []).filter(Boolean).forEach((h) => paragraphs.push(bullet(h)));
          paragraphs.push(spacer(60));
        });
        break;
      }

      case 'certifications': {
        if (!resumeData.certifications?.length) break;
        paragraphs.push(sectionTitle('Certifications'));
        resumeData.certifications.forEach((cert) => {
          const parts = [cert.name, cert.issuer ? `– ${cert.issuer}` : null, cert.date ? `(${cert.date})` : null].filter(Boolean).join('  ');
          paragraphs.push(bullet(parts));
        });
        paragraphs.push(spacer(80));
        break;
      }

      case 'hackathons': {
        if (!resumeData.hackathons?.length) break;
        paragraphs.push(sectionTitle('Hackathons & Awards'));
        resumeData.hackathons.forEach((hack) => {
          const parts = [
            hack.name,
            hack.description ? `– ${hack.description}` : null,
            hack.date ? `(${hack.date})` : null,
          ].filter(Boolean).join('  ');
          paragraphs.push(bullet(parts));
        });
        paragraphs.push(spacer(80));
        break;
      }

      default:
        break;
    }
  }

  const doc = new Document({
    creator: 'Resume Updater',
    title: personal.name || 'Resume',
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          quickFormat: true,
          // Arial 11pt — Google Docs default body
          run: { font: 'Arial', size: PT(11), color: C.dark },
          // Line spacing 1.15 (276 twips ≈ 1.15) — matches Docs default
          paragraph: { spacing: { line: 276 } },
        },
        {
          id: 'ListParagraph',
          name: 'List Paragraph',
          basedOn: 'Normal',
          run: { font: 'Arial', size: PT(11), color: C.dark },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            // 1.0 inch margins (1440 twips) — Google Docs default
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBlob(doc);
};

export const exportToDOCX = async (resumeData, fileName = 'resume.docx', sectionOrder) => {
  const blob = await generateDocxBlob(resumeData, sectionOrder);
  saveAs(blob, fileName);
};
