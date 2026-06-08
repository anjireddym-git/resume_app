import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildEvidenceMatrix,
  buildTargetRoleContract,
  buildTargetRoleContractInstructions,
  validateTargetRoleContract,
} = require('./targetRoleContract');

const seniorJavaJd = 'Senior Java Developer building high-volume REST APIs, SQL-backed services, and Kafka integrations.';

function resume({ title = 'Software Engineer', summary = '', skills = {}, latestHighlights = [] } = {}) {
  return {
    personalInfo: { title },
    summary,
    skills,
    experience: [
      {
        company: 'CurrentCo',
        position: title,
        location: 'Dallas, TX',
        startDate: '2022-01',
        endDate: 'Present',
        highlights: latestHighlights,
      },
    ],
  };
}

function contractAndMatrix(base = resume()) {
  const contract = buildTargetRoleContract(seniorJavaJd);
  return {
    contract,
    matrix: buildEvidenceMatrix(base, contract),
  };
}

describe('target role contract helpers', () => {
  it('infers a Java backend contract and includes Spring Boot even when the JD omits it', () => {
    const contract = buildTargetRoleContract(seniorJavaJd);
    const labels = contract.requirements.map((requirement) => requirement.label);

    expect(contract).toMatchObject({ id: 'java_backend', detected: true });
    expect(labels).toContain('Java');
    expect(labels).toContain('Spring Boot');
    expect(labels).toContain('REST APIs');
    expect(labels).toContain('Kafka');
  });

  it('marks Spring Boot as explicit when the base resume already has it', () => {
    const base = resume({
      skills: { Backend: ['Java', 'Spring Boot', 'REST APIs'] },
      latestHighlights: ['Built Spring Boot services with Java and REST APIs.'],
    });
    const { contract, matrix } = contractAndMatrix(base);
    const springBoot = matrix.requirements.find((entry) => entry.requirementId === 'spring_boot');

    expect(contract.requirements.find((requirement) => requirement.id === 'spring_boot')).toBeTruthy();
    expect(springBoot.evidence).toBe('explicit_supported');
  });

  it('marks Spring Boot as a role-default assumption when Java and REST evidence exist without Spring Boot', () => {
    const base = resume({
      skills: { Backend: ['Java', 'REST APIs', 'SQL'] },
      latestHighlights: ['Developed Java REST APIs for SQL-backed enterprise workflows.'],
    });
    const { matrix } = contractAndMatrix(base);
    const springBoot = matrix.requirements.find((entry) => entry.requirementId === 'spring_boot');

    expect(springBoot.evidence).toBe('role_default_unverified');
    expect(matrix.warnings.join('\n')).toContain('Spring Boot is expected');
  });

  it('marks Java backend requirements unsupported when the base resume has no backend evidence', () => {
    const base = resume({
      title: 'Business Analyst',
      skills: { Analysis: ['Excel', 'Reporting'] },
      latestHighlights: ['Created stakeholder reports and operational dashboards.'],
    });
    const { matrix } = contractAndMatrix(base);
    const springBoot = matrix.requirements.find((entry) => entry.requirementId === 'spring_boot');

    expect(matrix.hasRoleFamilyEvidence).toBe(false);
    expect(springBoot.evidence).toBe('unsupported');
  });

  it('fails generated Senior Java resumes that omit Spring Boot', () => {
    const base = resume({
      skills: { Backend: ['Java', 'REST APIs', 'SQL'] },
      latestHighlights: ['Developed Java REST APIs for SQL-backed enterprise workflows.'],
    });
    const generated = resume({
      title: 'Senior Java Developer',
      summary: 'Senior Java Developer focused on REST APIs and microservices.',
      skills: { Backend: ['Java', 'REST APIs', 'Microservices', 'SQL', 'Hibernate', 'JUnit', 'Maven'] },
      latestHighlights: ['Built Java REST APIs and microservices with SQL persistence, JUnit testing, Maven builds, and operational monitoring.'],
    });
    const { contract, matrix } = contractAndMatrix(base);
    const result = validateTargetRoleContract(base, generated, contract, matrix);

    expect(result.ok).toBe(false);
    expect(result.coverageIssues.join('\n')).toContain('Spring Boot missing from skills');
    expect(result.coverageIssues.join('\n')).toContain('Spring Boot missing from title/summary');
    expect(result.coverageIssues.join('\n')).toContain('Spring Boot missing from latest experience');
  });

  it('fails when Spring Boot appears only in skills but not title/summary or latest experience', () => {
    const base = resume({ skills: { Backend: ['Java', 'REST APIs', 'SQL'] } });
    const generated = resume({
      title: 'Senior Java Developer',
      summary: 'Senior Java Developer focused on REST APIs and microservices.',
      skills: { Backend: ['Java', 'Spring Boot', 'REST APIs', 'Microservices', 'SQL', 'Hibernate', 'JUnit', 'Maven'] },
      latestHighlights: ['Built Java REST APIs and microservices with SQL persistence, JUnit testing, Maven builds, and operational monitoring.'],
    });
    const { contract, matrix } = contractAndMatrix(base);
    const result = validateTargetRoleContract(base, generated, contract, matrix);

    expect(result.ok).toBe(false);
    expect(result.coverageIssues.join('\n')).not.toContain('Spring Boot missing from skills');
    expect(result.coverageIssues.join('\n')).toContain('Spring Boot missing from title/summary');
    expect(result.coverageIssues.join('\n')).toContain('Spring Boot missing from latest experience');
  });

  it('passes when Spring Boot and Java backend requirements hit required placements', () => {
    const base = resume({
      skills: { Backend: ['Java', 'REST APIs', 'SQL'] },
      latestHighlights: ['Developed Java REST APIs for SQL-backed enterprise workflows.'],
    });
    const generated = resume({
      title: 'Senior Java Spring Boot Developer',
      summary: 'Senior Java Developer building Spring Boot microservices, REST APIs, SQL-backed services, and production-ready backend platforms.',
      skills: {
        Backend: [
          'Java', 'Spring Boot', 'Spring Framework', 'REST APIs', 'Microservices',
          'Hibernate', 'JPA', 'SQL', 'JUnit', 'Maven', 'Kafka',
        ],
      },
      latestHighlights: [
        'Built Java Spring Boot microservices with Spring Framework REST APIs, SQL persistence, Hibernate JPA data access, JUnit coverage, Maven builds, Kafka integration, and production release support.',
      ],
    });
    const { contract, matrix } = contractAndMatrix(base);
    const result = validateTargetRoleContract(base, generated, contract, matrix);

    expect(result.ok).toBe(true);
    expect(result.coverageIssues).toEqual([]);
    expect(result.evidenceWarnings.join('\n')).toContain('Spring Boot is expected');
  });

  it('builds prompt instructions with placement gates and evidence warnings for repair', () => {
    const base = resume({ skills: { Backend: ['Java', 'REST APIs', 'SQL'] } });
    const { contract, matrix } = contractAndMatrix(base);
    const instructions = buildTargetRoleContractInstructions(contract, matrix);

    expect(instructions).toContain('TARGET ROLE CONTRACT');
    expect(instructions).toContain('Spring Boot: required in skills, title/summary, latest experience');
    expect(instructions).toContain('role_default_unverified');
    expect(instructions).toContain('Role-default assumptions are placement obligations');
  });
});
