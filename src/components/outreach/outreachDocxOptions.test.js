import { describe, expect, it, vi } from 'vitest';
import PizZip from 'pizzip';
import { generateDocxBlob } from '../../services/exportService';
import { buildOutreachDocxRenderOptions, sanitizeOutreachFilename } from './outreachDocxOptions';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

async function readDocumentXml(blob) {
  const buffer = await blob.arrayBuffer();
  const zip = new PizZip(buffer);
  return zip.file('word/document.xml').asText();
}

describe('outreach DOCX attachment options', () => {
  it('builds the same design-aware render options for preview, download, and send', async () => {
    const baseGroup = {
      sectionOrder: ['skills', 'summary', 'customTargetNotes'],
      visibleSections: ['summary', 'customTargetNotes'],
      themeConfig: {
        spacing: { pagePadding: 48 },
        colors: { sectionTitleColor: '#AA0000', border: '#AA0000' },
      },
      customSectionDefs: [{ id: 'customTargetNotes', title: 'Target Notes' }],
    };
    const tailoredResume = {
      personalInfo: { name: 'Ari Patel', title: 'Platform Engineer' },
      summary: 'Built cloud automation for healthcare teams',
      skills: { Languages: ['Python'] },
      customSections: {
        customTargetNotes: '- Mentions platform automation\n- Includes recruiter context',
      },
      sectionFormats: { summary: 'points' },
    };

    const options = buildOutreachDocxRenderOptions(baseGroup, tailoredResume);
    const blob = await generateDocxBlob(tailoredResume, options);
    const documentXml = await readDocumentXml(blob);

    expect(options.sectionOrder).toEqual(['summary', 'customTargetNotes']);
    expect(options.themeConfig).toBe(baseGroup.themeConfig);
    expect(options.customSectionDefs).toEqual(baseGroup.customSectionDefs);
    expect(documentXml).toContain('w:top="960"');
    expect(documentXml).toContain('Professional Summary');
    expect(documentXml).toContain('Target Notes');
    expect(documentXml).toContain('Mentions platform automation');
    expect(documentXml).not.toContain('Technical Skills');
  });

  it('sanitizes generated outreach attachment filenames', () => {
    expect(sanitizeOutreachFilename('Ari Patel / Lead: AI Platform?')).toBe('Ari_Patel_Lead_AI_Platform');
    expect(sanitizeOutreachFilename('')).toBe('Resume');
  });
});

