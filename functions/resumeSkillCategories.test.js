import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  collectSkillTextParts,
  collectSkillValues,
  normalizeResumeSkillCategories,
  normalizeSkillCategories,
} = require('./resumeSkillCategories');

describe('resume skill category normalization', () => {
  it('preserves dynamic category labels and order from AI category rows', () => {
    const normalized = normalizeSkillCategories([
      { label: 'AI/ML & GenAI', items: ['Python', 'LangChain', 'Python'] },
      { label: 'Cloud Platforms', items: ['AWS', 'Azure', 'aws'] },
      { label: 'Python Libraries', items: ['Pandas', 'NumPy', 'LangChain'] },
    ]);

    expect(Object.keys(normalized)).toEqual([
      'AI/ML & GenAI',
      'Cloud Platforms',
      'Python Libraries',
    ]);
    expect(normalized['AI/ML & GenAI']).toEqual(['Python', 'LangChain']);
    expect(normalized['Cloud Platforms']).toEqual(['AWS', 'Azure']);
    expect(normalized['Python Libraries']).toEqual(['Pandas', 'NumPy']);
  });

  it('accepts legacy skill objects and comma-separated values without changing category order', () => {
    const normalized = normalizeSkillCategories({
      'Cloud Platforms': ['AWS', 'Azure'],
      Databases: 'PostgreSQL, MongoDB, PostgreSQL',
      'Python Libraries': { items: ['Pandas', 'NumPy'] },
    });

    expect(Object.keys(normalized)).toEqual(['Cloud Platforms', 'Databases', 'Python Libraries']);
    expect(normalized.Databases).toEqual(['PostgreSQL', 'MongoDB']);
  });

  it('normalizes a full resume and exposes skill values/text for validation helpers', () => {
    const resume = normalizeResumeSkillCategories({
      personalInfo: { title: 'AI Engineer' },
      skills: [
        { label: 'Cloud Platforms', items: ['AWS', 'GCP'] },
        { label: 'Cloud Platforms', items: ['Azure', 'AWS'] },
      ],
    });

    expect(resume.skills).toEqual({
      'Cloud Platforms': ['AWS', 'GCP', 'Azure'],
    });
    expect(collectSkillValues(resume.skills)).toEqual(['AWS', 'GCP', 'Azure']);
    expect(collectSkillTextParts(resume.skills)).toEqual(['Cloud Platforms', 'AWS', 'GCP', 'Azure']);
  });
});
