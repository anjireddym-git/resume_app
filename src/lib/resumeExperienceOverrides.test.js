import { describe, expect, it } from 'vitest';
import { buildCustomExperienceForSave, buildResumeCustomDataForSave } from './resumeExperienceOverrides';

describe('buildCustomExperienceForSave', () => {
  it('keeps shared timeline fields out of resume custom data when unchanged', () => {
    const customExperience = buildCustomExperienceForSave([
      {
        position: 'Lead AI/ML Engineer',
        company: 'Humana',
        location: 'Remote',
        startDate: '2024-10',
        endDate: 'Present',
        highlights: ['Built ML services.'],
        environment: 'Python, Azure',
      },
    ], [
      {
        position: 'Lead AI/ML Engineer',
        company: 'Humana',
        location: 'Remote',
        startDate: '2024-10',
        endDate: 'Present',
      },
    ]);

    expect(customExperience).toEqual([
      {
        highlights: ['Built ML services.'],
        environment: 'Python, Azure',
      },
    ]);
  });

  it('persists edited experience titles as resume-level overrides', () => {
    const customExperience = buildCustomExperienceForSave([
      {
        position: 'Senior AI/ML Engineer',
        company: 'Humana',
        highlights: ['Built ML services.'],
      },
    ], [
      {
        position: 'Lead AI/ML Engineer',
        company: 'Humana',
      },
    ]);

    expect(customExperience).toEqual([
      {
        highlights: ['Built ML services.'],
        environment: '',
        position: 'Senior AI/ML Engineer',
      },
    ]);
  });

  it('preserves identity fields when no shared entry exists', () => {
    const customExperience = buildCustomExperienceForSave([
      {
        position: 'Machine Learning Engineer',
        company: 'NewCo',
        location: 'Chicago, IL',
        startDate: '2026-01',
        endDate: 'Present',
        highlights: [],
      },
    ], []);

    expect(customExperience).toEqual([
      {
        highlights: [],
        environment: '',
        position: 'Machine Learning Engineer',
        company: 'NewCo',
        location: 'Chicago, IL',
        startDate: '2026-01',
        endDate: 'Present',
      },
    ]);
  });

  it('builds complete custom data without dropping custom sections', () => {
    const customData = buildResumeCustomDataForSave({
      personalInfo: { name: 'Anji Reddy' },
      summary: 'Senior engineer',
      experience: [
        {
          position: 'Senior AI/ML Engineer',
          company: 'Humana',
          highlights: ['Built ML services.'],
        },
      ],
      education: [],
      skills: { Languages: ['Python'] },
      projects: [],
      certifications: [],
      internships: [],
      hackathons: [],
      customSections: { awards: 'Innovation award' },
    }, {
      sharedData: {
        experience: [{ position: 'Lead AI/ML Engineer', company: 'Humana' }],
      },
    });

    expect(customData).toMatchObject({
      personalInfo: { name: 'Anji Reddy' },
      summary: 'Senior engineer',
      education: [],
      educationOverride: true,
      skills: { Languages: ['Python'] },
      customSections: { awards: 'Innovation award' },
    });
    expect(customData.experience[0].position).toBe('Senior AI/ML Engineer');
  });
});
