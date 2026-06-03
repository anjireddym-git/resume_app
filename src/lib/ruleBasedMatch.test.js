import { describe, expect, it } from 'vitest';
import { calculateRuleBasedMatch, tokenizeMatchText } from './ruleBasedMatch';

const reactResume = {
  personalInfo: { title: 'Senior Frontend Engineer' },
  summary: 'Frontend engineer building React, TypeScript, and API-backed dashboards.',
  skills: { frontend: ['React', 'TypeScript', 'Next.js'], backend: ['Node.js'] },
  experience: [{
    position: 'Senior Frontend Engineer',
    highlights: [
      'Built React dashboards with TypeScript, REST API integrations, accessibility improvements, and release validation.',
    ],
  }],
};

const analystResume = {
  personalInfo: { title: 'Business Analyst' },
  summary: 'Analyst focused on reporting workflows and stakeholder documentation.',
  skills: { analysis: ['Excel', 'Tableau'] },
  experience: [{
    position: 'Business Analyst',
    highlights: ['Documented reporting requirements and maintained Tableau dashboards.'],
  }],
};

describe('rule-based match scoring', () => {
  it('normalizes common technical spellings', () => {
    expect(tokenizeMatchText('Node.js Next.js CI/CD C++ C#')).toEqual(
      expect.arrayContaining(['nodejs', 'nextjs', 'cicd', 'cplusplus', 'csharp']),
    );
  });

  it('scores a resume higher when it overlaps the current JD', () => {
    const jd = 'Senior Frontend Engineer role with React, TypeScript, REST APIs, accessibility, and Next.js.';

    const reactScore = calculateRuleBasedMatch(jd, reactResume).score;
    const analystScore = calculateRuleBasedMatch(jd, analystResume).score;

    expect(reactScore).toBeGreaterThan(analystScore);
    expect(reactScore).toBeGreaterThanOrEqual(60);
  });

  it('does not produce a stale score when there is no current JD', () => {
    expect(calculateRuleBasedMatch('', reactResume)).toBeNull();
  });
});
