import { Document, Packer, Paragraph, TextRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { formatDate } from '../lib/dateUtils';
import { getSummaryPoints } from '../lib/summaryUtils';

// DOCX Export - keeping this as it's a different format
export const exportToDOCX = async (resumeData, fileName = 'resume.docx') => {
  if (!resumeData) throw new Error('Resume data not found');

  const colors = {
    text: '1f2937',
    muted: '6b7280',
    accent: '2563eb',
    border: 'e5e7eb',
  };

  const makeParagraph = (text, options = {}) => new Paragraph({
    children: [new TextRun({ text: text || '', ...options })],
    spacing: { after: 80, line: 276 },
  });

  const makeBullet = (text) => new Paragraph({
    text: text || '',
    bullet: { level: 0 },
    spacing: { after: 120, line: 276 },
    style: 'ListParagraph',
  });

  const doc = new Document({
    creator: 'Resume Updater',
    description: 'Generated resume',
    title: resumeData.personalInfo?.name || 'Resume',
    sections: [],
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          quickFormat: true,
          run: { font: 'Helvetica', size: 20, color: colors.text },
          paragraph: { spacing: { line: 276 } },
        },
        {
          id: 'Heading',
          name: 'Heading',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font: 'Helvetica', size: 22, bold: true, color: colors.text },
          paragraph: { spacing: { after: 200 }, border: { bottom: { color: colors.border, space: 2, size: 6, style: BorderStyle.SINGLE } } },
        },
        {
          id: 'ListParagraph',
          name: 'List Paragraph',
          basedOn: 'Normal',
          run: { font: 'Helvetica', size: 20, color: colors.text },
        },
      ],
    },
  });

  const sections = [];
  const personal = resumeData.personalInfo || {};

  // Header
  sections.push({
    children: [
      makeParagraph(personal.name || 'Your Name', { size: 28, bold: true }),
      makeParagraph(
        [personal.location, personal.phone, personal.email, personal.linkedin, personal.github]
          .filter(Boolean)
          .join(' • '),
        { size: 20, color: colors.muted }
      ),
    ],
  });

  // Summary
  if (resumeData.summary) {
    const summaryPoints = getSummaryPoints(resumeData.summary);
    sections.push({
      children: [
        makeParagraph('Professional Summary', { bold: true, color: colors.muted, size: 20 }),
        ...summaryPoints.map((point) => makeBullet(point)),
      ],
    });
  }

  // Technical Skills (placed before experience to match PDF order)
  const skillsText = [];
  const s = resumeData.skills || {};
  if (s.languages?.length) skillsText.push(`Languages: ${s.languages.join(', ')}`);
  if (s.frameworks?.length) skillsText.push(`Frameworks: ${s.frameworks.join(', ')}`);
  if (s.tools?.length) skillsText.push(`Tools: ${s.tools.join(', ')}`);
  if (s.databases?.length) skillsText.push(`Databases: ${s.databases.join(', ')}`);
  if (s.other?.length) skillsText.push(`Other: ${s.other.join(', ')}`);
  if (skillsText.length) {
    sections.push({
      children: [
        makeParagraph('Technical Skills', { bold: true, color: colors.muted, size: 20 }),
        ...skillsText.map((t) => makeParagraph(t, { size: 20 })),
      ],
    });
  }

  // Experience
  if (resumeData.experience?.length) {
    resumeData.experience.forEach((exp) => {
      const bullets = (exp.highlights || []).map((h) => h || '');
      sections.push({
        children: [
          makeParagraph(exp.position || 'Role', { bold: true, size: 22 }),
          makeParagraph([exp.company, exp.location, `${formatDate(exp.startDate)} – ${formatDate(exp.endDate) || 'Present'}`].filter(Boolean).join(' · '), {
            size: 20,
            color: colors.muted,
          }),
          ...bullets.map((b) => makeBullet(b)),
          exp.environment ? makeParagraph(`Environment: ${exp.environment}`, { size: 18, color: colors.muted }) : null,
        ].filter(Boolean),
      });
    });
  }

  // Internships
  if (resumeData.internships?.length) {
    resumeData.internships.forEach((intern) => {
      const bullets = (intern.highlights || []).map((h) => h || '');
      sections.push({
        children: [
          makeParagraph(intern.position || 'Intern', { bold: true, size: 22 }),
          makeParagraph([intern.company, intern.duration || `${formatDate(intern.startDate)} – ${formatDate(intern.endDate)}`].filter(Boolean).join(' · '), {
            size: 20,
            color: colors.muted,
          }),
          ...bullets.map((b) => makeBullet(b)),
        ],
      });
    });
  }

  // Education
  if (resumeData.education?.length) {
    resumeData.education.forEach((edu) => {
      const degree = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree;
      sections.push({
        children: [
          makeParagraph(degree || 'Degree', { bold: true, size: 21 }),
          makeParagraph([edu.institution, edu.location, formatDate(edu.graduationDate)].filter(Boolean).join(' · '), {
            size: 20,
            color: colors.muted,
          }),
          edu.gpa ? makeParagraph(`GPA: ${edu.gpa}`, { size: 19, color: colors.accent }) : null,
        ].filter(Boolean),
      });
    });
  }

  // Projects
  if (resumeData.projects?.length) {
    resumeData.projects.forEach((project) => {
      sections.push({
        children: [
          makeParagraph(project.name || 'Project', { bold: true, size: 22 }),
          project.link ? makeParagraph(project.link, { size: 20, color: colors.accent }) : null,
          project.description ? makeParagraph(project.description, { size: 20 }) : null,
          project.technologies?.length ? makeParagraph(project.technologies.join(' • '), { size: 19, color: colors.muted }) : null,
        ].filter(Boolean),
      });
    });
  }

  // Certifications
  if (resumeData.certifications?.length) {
    sections.push({
      children: [
        makeParagraph('Certifications', { bold: true, color: colors.muted, size: 20 }),
        ...resumeData.certifications.map((cert) => makeParagraph([cert.name, cert.issuer, cert.date].filter(Boolean).join(' · '), { size: 20 })),
      ],
    });
  }

  doc.addSection({ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children: sections.flatMap((s) => s.children) });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, fileName);
};
