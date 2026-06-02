import { describe, expect, it } from 'vitest';
import { buildStandardResumeName } from './resumeNaming';

describe('buildStandardResumeName', () => {
  it('builds standardized role and stack names from AI metadata', () => {
    expect(buildStandardResumeName({
      generatedResumeData: {
        personalInfo: { title: 'Senior AI/ML Engineer - Healthcare Platform' },
        metadata: { atsKeywordsCovered: ['Python', 'AWS Lambda', 'FastAPI'] },
      },
      jobDescription: 'Build Python and AWS services for healthcare document intelligence.',
    })).toBe('Senior_AI_ML_Engineer_Python_AWS_FastAPI');
  });

  it('normalizes dot net role names with Azure stack context', () => {
    expect(buildStandardResumeName({
      sourceName: 'Base Resume',
      generatedResumeData: {
        metadata: { targetPersonaTitle: 'Dot Net Engineer with Azure' },
        skills: { Cloud: ['Azure'], Languages: ['C#', '.NET'] },
      },
      jobDescription: 'Need a .NET engineer for Azure services.',
    })).toBe('Dot_Net_Engineer_Azure');
  });
});
