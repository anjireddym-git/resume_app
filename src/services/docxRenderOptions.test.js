import { describe, expect, it } from 'vitest';
import { buildDocxRenderOptions } from './docxRenderOptions';

describe('buildDocxRenderOptions', () => {
  it('builds the editor export render option shape from explicit editor state', () => {
    const group = {
      themeConfig: { colors: { accent: '#0055AA' } },
      customSectionDefs: [{ id: 'targetNotes', title: 'Target Notes' }],
    };
    const resumeData = {
      sectionFormats: { summary: 'points' },
      customSectionDefs: [{ id: 'ignored', title: 'Ignored' }],
    };

    const options = buildDocxRenderOptions({
      group,
      resumeData,
      sectionOrder: ['skills', 'summary', 'targetNotes'],
      visibleSections: ['summary', 'targetNotes'],
    });

    expect(options).toEqual({
      sectionOrder: ['summary', 'targetNotes'],
      visibleSections: ['summary', 'targetNotes'],
      themeConfig: group.themeConfig,
      sectionFormats: resumeData.sectionFormats,
      customSectionDefs: group.customSectionDefs,
    });
  });

  it('falls back to resume-level render data when group layout fields are missing', () => {
    const resumeData = {
      sectionOrder: ['experience', 'summary', 'customWork'],
      visibleSections: ['summary', 'customWork'],
      themeConfig: { spacing: { pagePadding: 42 } },
      sectionFormats: { experience: 'compact' },
      customSectionDefs: [{ id: 'customWork', title: 'Selected Work' }],
    };

    const options = buildDocxRenderOptions({ group: {}, resumeData });

    expect(options.sectionOrder).toEqual(['summary', 'customWork']);
    expect(options.visibleSections).toEqual(['summary', 'customWork']);
    expect(options.themeConfig).toBe(resumeData.themeConfig);
    expect(options.sectionFormats).toBe(resumeData.sectionFormats);
    expect(options.customSectionDefs).toBe(resumeData.customSectionDefs);
  });

  it('does not re-add a custom section that is explicitly hidden', () => {
    const options = buildDocxRenderOptions({
      group: {
        sectionOrder: ['summary', 'customWork'],
        visibleSections: ['summary'],
        customSectionDefs: [{ id: 'customWork', title: 'Selected Work' }],
      },
      resumeData: {},
    });

    expect(options.sectionOrder).toEqual(['summary']);
    expect(options.visibleSections).toEqual(['summary']);
  });
});
