import { describe, expect, it, vi } from 'vitest';
import PizZip from 'pizzip';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { generateDocxBlob } from './exportService';

async function readDocxXml(blob, path = 'word/document.xml') {
  const buffer = await blob.arrayBuffer();
  const zip = new PizZip(buffer);
  return zip.file(path).asText();
}

const resumeFixture = {
  personalInfo: {
    name: 'Ari Patel',
    title: 'Principal Document Engineer',
    email: 'ari@example.com',
    location: 'Austin, TX',
    github: 'github.com/ari',
  },
  summary: 'Built reliable data platforms\nImproved document generation fidelity',
  skills: {
    'AI/ML & GenAI': ['RAG', 'Prompt Evaluation'],
    'Cloud Platforms': ['AWS', 'Google Cloud'],
  },
  experience: [
    {
      position: 'Senior Engineer',
      company: 'DocsCo',
      location: 'Remote',
      startDate: '2023-01',
      endDate: 'Present',
      highlights: [
        'Reduced export drift by consolidating preview, download, and Google Docs sync into one rendering path.',
      ],
    },
  ],
  projects: [
    {
      name: 'Resume Renderer',
      date: '2026',
      technologies: ['React', 'DOCX'],
      description: 'Generated resumes from shared layout tokens.',
      highlights: ['Matched dashboard preview to downloaded documents.'],
    },
  ],
  customSections: {
    awards: '- Won design fidelity award\nPublished layout QA notes',
  },
};

describe('generateDocxBlob', () => {
  it('uses render options for margins, font, color, order, visibility, and custom sections', async () => {
    const blob = await generateDocxBlob(resumeFixture, {
      sectionOrder: ['skills', 'summary', 'projects', 'awards'],
      visibleSections: ['summary', 'projects', 'awards'],
      customSectionDefs: [{ id: 'awards', title: 'Awards' }],
      themeConfig: {
        typography: { fontFamily: 'Georgia', fontSize: 11, lineHeight: 1.3, headingScale: 1.25, nameScale: 2 },
        spacing: { pagePadding: 50, sectionMargin: 10, itemMargin: 6 },
        colors: {
          text: '#111111',
          secondary: '#555555',
          accent: '#1155CC',
          border: '#AA0000',
          sectionTitleColor: '#AA0000',
          background: '#ffffff',
        },
        header: { layout: 'left', contactSeparator: '•', nameBold: true },
        sectionTitle: { uppercase: true, bold: true, border: 'bottom', align: 'left', letterSpacing: 1 },
        content: { bulletStyle: '•', dateFormat: 'MMM YYYY', dateAlign: 'right' },
      },
    });

    const documentXml = await readDocxXml(blob);
    const stylesXml = await readDocxXml(blob, 'word/styles.xml');

    expect(documentXml).toContain('w:top="1000"');
    expect(stylesXml).toContain('w:ascii="Georgia"');
    expect(documentXml).toContain('w:color w:val="AA0000"');
    expect(documentXml).not.toContain('Technical Skills');
    expect(documentXml.indexOf('Professional Summary')).toBeLessThan(documentXml.indexOf('Projects'));
    expect(documentXml.indexOf('Projects')).toBeLessThan(documentXml.indexOf('Awards'));
    expect(documentXml).toContain('Won design fidelity award');
    expect(documentXml).toContain('Published layout QA notes');
  });

  it('preserves human skill labels and writes real numbering for bullets', async () => {
    const blob = await generateDocxBlob(resumeFixture, {
      sectionOrder: ['skills', 'summary'],
      themeConfig: {
        content: { bulletStyle: '▸' },
      },
    });

    const documentXml = await readDocxXml(blob);
    const numberingXml = await readDocxXml(blob, 'word/numbering.xml');

    expect(documentXml).toContain('AI/ML &amp; GenAI');
    expect(documentXml).toContain('Cloud Platforms');
    expect(numberingXml).toContain('w:numFmt w:val="bullet"');
    expect(numberingXml).toContain('▸');
  });

  it('applies section format choices to compact and inline sections', async () => {
    const blob = await generateDocxBlob({
      ...resumeFixture,
      certifications: [
        { name: 'AWS Certified Developer', issuer: 'AWS', date: '2024' },
        { name: 'Google Cloud Associate', issuer: 'Google', date: '2025' },
      ],
    }, {
      sectionOrder: ['projects', 'certifications'],
      sectionFormats: {
        projects: 'compact',
        certifications: 'inline',
      },
    });

    const documentXml = await readDocxXml(blob);
    expect(documentXml).toContain('Resume Renderer');
    expect(documentXml).toContain('React');
    expect(documentXml).not.toContain('Matched dashboard preview to downloaded documents.');
    expect(documentXml).toContain('AWS Certified Developer');
    expect(documentXml).toContain('Google Cloud Associate');
  });

  it('strips imported bullet markers before writing DOCX bullet paragraphs', async () => {
    const blob = await generateDocxBlob({
      ...resumeFixture,
      summary: '• Built reliable data platforms\n- Improved document generation fidelity',
      experience: [
        {
          position: 'Lead Engineer',
          company: 'DocsCo',
          startDate: '2024-01',
          endDate: 'Present',
          highlights: [
            '• Designed Python services for document processing.',
            '- Integrated OpenAI APIs for extraction workflows.',
            '1. Improved validation and release checks.',
          ],
        },
      ],
      projects: [
        {
          name: 'Renderer',
          highlights: ['• Matched preview and export output.'],
        },
      ],
    }, {
      sectionOrder: ['summary', 'experience', 'projects'],
    });

    const documentXml = await readDocxXml(blob);
    expect(documentXml).toContain('Designed Python services');
    expect(documentXml).toContain('Integrated OpenAI APIs');
    expect(documentXml).toContain('Improved validation');
    expect(documentXml).not.toContain('• Designed Python services');
    expect(documentXml).not.toContain('- Integrated OpenAI APIs');
    expect(documentXml).not.toContain('1. Improved validation');
    expect(documentXml).not.toContain('• Matched preview and export output.');
  });

  it('maps customization panel controls into DOCX header, spacing, dates, locations, and bullets', async () => {
    const blob = await generateDocxBlob(resumeFixture, {
      sectionOrder: ['experience'],
      themeConfig: {
        typography: { letterSpacing: 1.25 },
        colors: {
          text: '#111111',
          secondary: '#333333',
          accent: '#FF0000',
          border: '#00AA00',
          sectionTitleColor: '#111111',
        },
        header: {
          layout: 'twoColumn',
          titleStyle: 'uppercase',
          contactSeparator: '/',
          nameDivider: true,
        },
        sectionTitle: {
          border: 'thick',
          borderWidth: 1.5,
        },
        content: {
          bulletStyle: '◆',
          bulletColor: 'accent',
          dateAlign: 'inline',
          dateFormat: 'YYYY',
        },
        experience: {
          titlePosition: 'company-first',
          locationPlacement: 'below',
        },
      },
    });

    const documentXml = await readDocxXml(blob);
    const numberingXml = await readDocxXml(blob, 'word/numbering.xml');

    expect(documentXml).toContain('PRINCIPAL DOCUMENT ENGINEER');
    expect(documentXml.indexOf('DocsCo')).toBeLessThan(documentXml.indexOf('Senior Engineer'));
    expect(documentXml).toContain('Remote');
    expect(documentXml).toContain('2023');
    expect(documentXml).toContain('Present');
    expect(documentXml).toContain('w:spacing w:val="25"');
    expect(documentXml).toContain('w:color="00AA00"');
    expect(documentXml).toContain('w:sz="24"');
    expect(numberingXml).toContain('◆');
    expect(numberingXml).toContain('w:color w:val="FF0000"');
  });
});
