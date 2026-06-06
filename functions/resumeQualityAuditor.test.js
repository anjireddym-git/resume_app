import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  QUALITY_ISSUE_PATTERNS,
  applyDeterministicQualityRepairs,
  auditResumeQuality,
  reorderSkillsForTarget,
  softenUnsupportedMetricText,
} = require('./resumeQualityAuditor');
const {
  buildTargetRoleContract,
} = require('./targetRoleContract');

const javaJd = 'Senior Java Developer with Java, Spring Boot, REST APIs, Microservices, AWS, SQL, JUnit, Maven, and Gradle.';
const javaContract = buildTargetRoleContract(javaJd);

function resume({ skills = {}, highlights = [] } = {}) {
  return {
    personalInfo: { title: 'Senior Java Developer' },
    summary: 'Senior Java Developer building Spring Boot services.',
    skills,
    experience: [
      {
        company: 'CurrentCo',
        position: 'Senior Java Developer',
        highlights,
      },
    ],
  };
}

describe('resume quality auditor', () => {
  it('flags Java resumes where AI/ML categories appear before Java Backend', () => {
    const generated = resume({
      skills: {
        'AI/ML & GenAI': ['OpenAI API', 'RAG Workflows'],
        'Python/Data Libraries': ['pandas', 'NumPy'],
        'Java Backend': ['Java', 'Spring Boot', 'REST APIs'],
      },
      highlights: ['Built Java Spring Boot REST APIs for backend workflows with SQL persistence and JUnit coverage.'],
    });

    const audit = auditResumeQuality(resume(), generated, javaJd, javaContract);

    expect(audit.ok).toBe(false);
    expect(audit.hardIssues.join('\n')).toContain('Java Backend skill category must be first');
    expect(audit.roleCoherenceReport.offTargetCategoriesBeforeCore).toEqual(['AI/ML & GenAI', 'Python/Data Libraries']);
  });

  it('reorders Java Backend skills first while preserving all categories', () => {
    const skills = {
      'AI/ML & GenAI': ['OpenAI API'],
      Databases: ['SQL'],
      'Java Backend': ['Java', 'Spring Boot'],
      'AWS/Cloud': ['AWS'],
    };

    const repaired = reorderSkillsForTarget(skills, javaContract, javaJd);

    expect(Object.keys(repaired)).toEqual(['Java Backend', 'AWS/Cloud', 'Databases', 'AI/ML & GenAI']);
    expect(repaired['AI/ML & GenAI']).toEqual(['OpenAI API']);
  });

  it('flags repeated same-voice bullet structures and generic endings', () => {
    const generated = resume({
      skills: { 'Java Backend': ['Java', 'Spring Boot'] },
      highlights: [
        'Built Java workflow services with Spring Boot, REST APIs, SQL persistence, and release validation for operational stability.',
        'Built Java workflow adapters with Spring Boot, REST APIs, SQL persistence, and deployment validation for operational stability.',
        'Built Java workflow modules with Spring Boot, REST APIs, SQL persistence, and support validation for operational stability.',
      ],
    });

    const audit = auditResumeQuality(resume(), generated, javaJd, javaContract);

    expect(audit.qualityWarnings.join('\n')).toContain('repeated bullet structure');
    expect(audit.qualityWarnings.join('\n')).toContain('same-voice ending "operational stability"');
  });

  it('flags generic phrases and tool-stuffed bullets without treating length as a defect', () => {
    const generated = resume({
      skills: { 'Java Backend': ['Java', 'Spring Boot'] },
      highlights: [
        'Delivered features using Java, Spring Boot, Spring Framework, REST APIs, Microservices, Hibernate, JPA, JUnit, Maven, Gradle, AWS, Terraform, Docker, Kubernetes, PostgreSQL across enterprise workflows.',
      ],
    });

    const audit = auditResumeQuality(resume(), generated, javaJd, javaContract);

    expect(audit.hardIssues.join('\n')).toContain('tool-stuffed bullet');
    expect(audit.qualityWarnings.join('\n')).toContain('enterprise workflows');
    expect(audit.qualityWarnings.join('\n')).not.toContain('too many bullets');
  });

  it('rejects unsupported fake-precise metrics and allows conservative plausible ranges as assumptions', () => {
    const generated = resume({
      skills: { 'Java Backend': ['Java', 'Spring Boot'] },
      highlights: [
        'Standardized Maven pipelines, cutting build-time failures by 28% and improving deployment traceability.',
        'Refined Spring Boot release checks across 5-10 services and multi-environment releases for backend teams.',
      ],
    });

    const audit = auditResumeQuality(resume(), generated, javaJd, javaContract);

    expect(audit.hardIssues.join('\n')).toContain('unsupported precise metric');
    expect(audit.metricAssumptions.map((entry) => entry.metric)).toContain('5-10 services');
    expect(audit.claimRiskReport.some((entry) => entry.type === 'risky')).toBe(true);
    expect(audit.claimRiskReport.some((entry) => entry.type === 'plausible_metric_assumption')).toBe(true);
  });

  it('softens unsupported exact metrics into conservative ranges', () => {
    expect(softenUnsupportedMetricText('Reduced failures by 28% across 12 services with 99.99% uptime.'))
      .toBe('Reduced failures by 20-30% across 10-15 services with high availability.');
  });

  it('applies deterministic targeted repairs for skill ordering and risky metric softening', () => {
    const generated = resume({
      skills: {
        'AI/ML & GenAI': ['OpenAI API'],
        'Java Backend': ['Java', 'Spring Boot'],
      },
      highlights: ['Reduced failures by 28% across 12 services.'],
    });
    const audit = auditResumeQuality(resume(), generated, javaJd, javaContract);
    const repaired = applyDeterministicQualityRepairs(generated, audit.repairPlan, javaContract, javaJd);

    expect(Object.keys(repaired.skills)[0]).toBe('Java Backend');
    expect(repaired.experience[0].highlights[0]).toBe('Reduced failures by 20-30% across 10-15 services.');
  });

  it('treats screenshot-style authenticity and density warnings as targeted-repair candidates', () => {
    expect(QUALITY_ISSUE_PATTERNS.repairableSoft.test(
      'target stack overuse: Java backend appears as primary focus in 5/5 roles without matching base evidence'
    )).toBe(true);
    expect(QUALITY_ISSUE_PATTERNS.repairableSoft.test(
      'same target stack in every older role: Java backend appears in 4/4 older roles'
    )).toBe(true);
    expect(QUALITY_ISSUE_PATTERNS.repairableSoft.test(
      'bullet too short at experience "Lowe\'s"[10]: 23 words'
    )).toBe(true);
    expect(QUALITY_ISSUE_PATTERNS.repairableSoft.test(
      'high bullet similarity at "CurrentCo": bullets 1 and 2 overlap 80%'
    )).toBe(true);
  });
});
