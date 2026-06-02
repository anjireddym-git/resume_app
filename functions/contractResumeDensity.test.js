import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  CONTRACT_DENSITY,
  collectBulletWordIssues,
  getExperienceBulletRange,
  getOlderExperienceCombinedRequirement,
  getSummaryPointsForDensity,
  getSummaryRequirement,
  validateContractResumeDensity,
} = require('./contractResumeDensity');

const point = (index) => `Delivered contract-ready engineering summary point ${index} with measurable platform ownership and role-aligned delivery impact.`;

const bullet = (index) => (
  `Architected role-aligned platform capability ${index} across cloud services, APIs, data workflows, test automation, stakeholder reviews, deployment readiness, reliability improvements, and measurable delivery outcomes for distributed contract teams.`
);

const makeResume = ({ summaryCount = 12, expCounts = [20, 25, 25] } = {}) => ({
  summary: Array.from({ length: summaryCount }, (_, index) => point(index + 1)).join('\n'),
  experience: expCounts.map((count, index) => ({
    company: `Company ${index + 1}`,
    highlights: Array.from({ length: count }, (_, bulletIndex) => bullet(`${index + 1}.${bulletIndex + 1}`)),
  })),
});

describe('contract resume density helpers', () => {
  it('counts newline-separated summary points without splitting paragraphs into fake points', () => {
    expect(getSummaryPointsForDensity('One point.\n- Another point.\n• Third point.')).toHaveLength(3);
    expect(getSummaryPointsForDensity('One paragraph sentence. Another sentence. Third sentence.')).toHaveLength(1);
  });

  it('requires at least 12 summary points and preserves higher original summary counts', () => {
    expect(getSummaryRequirement('')).toMatchObject({
      min: CONTRACT_DENSITY.summaryMinPoints,
      targetMax: CONTRACT_DENSITY.summaryTargetMaxPoints,
    });

    const originalSummary = Array.from({ length: 17 }, (_, index) => point(index + 1)).join('\n');
    expect(getSummaryRequirement(originalSummary)).toMatchObject({
      originalCount: 17,
      min: 17,
      targetMax: 17,
    });
  });

  it('sets per-role experience minimums without reducing larger originals', () => {
    expect(getExperienceBulletRange(0, [])).toMatchObject({ min: 20 });
    expect(getExperienceBulletRange(1, [])).toMatchObject({ min: 16 });
    expect(getExperienceBulletRange(2, Array.from({ length: 22 }, (_, index) => `Original bullet ${index + 1}`))).toMatchObject({ min: 22 });
  });

  it('requires 50 older-role bullets combined when the resume has enough roles', () => {
    expect(getOlderExperienceCombinedRequirement([{ highlights: [] }, { highlights: [] }])).toMatchObject({
      applies: false,
      min: 0,
    });

    expect(getOlderExperienceCombinedRequirement([
      { highlights: [] },
      { highlights: [] },
      { highlights: [] },
    ])).toMatchObject({
      applies: true,
      min: 50,
    });
  });

  it('flags bullets that are too short or too long for two-line visual density', () => {
    const longBullet = Array.from({ length: CONTRACT_DENSITY.bulletValidatorMaxWords + 1 }, (_, index) => `word${index}`).join(' ');
    const issues = collectBulletWordIssues(['Built APIs quickly.', longBullet], 'experience "Company"');

    expect(issues[0]).toContain('bullet too short');
    expect(issues[1]).toContain('bullet too long');
  });

  it('fails thin generated resumes and passes contract-density generated resumes', () => {
    const original = makeResume({ summaryCount: 12, expCounts: [8, 8, 8] });
    const thinGenerated = makeResume({ summaryCount: 4, expCounts: [6, 6, 6] });
    const denseGenerated = makeResume({ summaryCount: 12, expCounts: [20, 25, 25] });

    const thinResult = validateContractResumeDensity(original, thinGenerated);
    expect(thinResult.hardIssues.join('\n')).toContain('too few summary points');
    expect(thinResult.hardIssues.join('\n')).toContain('too few bullets');
    expect(thinResult.hardIssues.join('\n')).toContain('too few older-experience bullets combined');

    const denseResult = validateContractResumeDensity(original, denseGenerated);
    expect(denseResult.hardIssues).toEqual([]);
    expect(denseResult.softIssues).toEqual([]);
  });
});
