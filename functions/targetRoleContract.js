const {
  collectSkillTextParts,
} = require('./resumeSkillCategories');

const EVIDENCE_LEVELS = Object.freeze({
  EXPLICIT: 'explicit_supported',
  ADJACENT: 'adjacent_supported',
  ROLE_DEFAULT_UNVERIFIED: 'role_default_unverified',
  UNSUPPORTED: 'unsupported',
});

const PLACEMENT_LABELS = Object.freeze({
  skills: 'skills',
  headline_summary: 'title/summary',
  latest_experience: 'latest experience',
  experience: 'experience',
});

const ROLE_FAMILIES = [
  {
    id: 'java_backend',
    label: 'Java Backend',
    detection: [
      /\bjava\b/i,
      /\bsenior\s+java\s+(developer|engineer|architect)\b/i,
      /\bjava\s+(backend|back-end|microservices?)\b/i,
      /\bspring\s+boot\b/i,
    ],
    roleEvidenceAliases: [
      'java', 'spring', 'spring boot', 'rest api', 'rest apis', 'microservices',
      'hibernate', 'jpa', 'maven', 'gradle', 'junit', 'sql',
    ],
    requirements: [
      {
        id: 'java',
        label: 'Java',
        aliases: ['java', 'core java'],
        placements: ['skills', 'headline_summary', 'latest_experience'],
        priority: 'core',
      },
      {
        id: 'spring_boot',
        label: 'Spring Boot',
        aliases: ['spring boot', 'springboot'],
        adjacentAliases: ['java', 'spring', 'rest api', 'rest apis', 'microservices', 'hibernate', 'jpa', 'maven', 'gradle', 'junit'],
        placements: ['skills', 'headline_summary', 'latest_experience'],
        priority: 'core',
      },
      {
        id: 'spring_framework',
        label: 'Spring Framework',
        aliases: ['spring framework', 'spring mvc', 'spring security', 'spring'],
        adjacentAliases: ['java', 'spring boot', 'rest api', 'microservices'],
        placements: ['skills', 'latest_experience'],
        priority: 'core',
      },
      {
        id: 'rest_apis',
        label: 'REST APIs',
        aliases: ['rest api', 'rest apis', 'restful api', 'restful apis', 'api development'],
        placements: ['skills', 'latest_experience'],
        priority: 'core',
      },
      {
        id: 'microservices',
        label: 'Microservices',
        aliases: ['microservices', 'microservice architecture', 'distributed services'],
        adjacentAliases: ['rest api', 'java', 'spring boot'],
        placements: ['skills', 'latest_experience'],
        priority: 'core',
      },
      {
        id: 'hibernate_jpa',
        label: 'Hibernate/JPA',
        aliases: ['hibernate', 'jpa', 'spring data jpa'],
        adjacentAliases: ['java', 'sql', 'database'],
        placements: ['skills'],
        priority: 'core',
      },
      {
        id: 'sql',
        label: 'SQL',
        aliases: ['sql', 'postgresql', 'mysql', 'oracle', 'sql server'],
        placements: ['skills'],
        priority: 'core',
      },
      {
        id: 'junit',
        label: 'JUnit',
        aliases: ['junit', 'junit 5', 'mockito', 'unit testing'],
        adjacentAliases: ['testing', 'test automation', 'java'],
        placements: ['skills'],
        priority: 'core',
      },
      {
        id: 'maven_gradle',
        label: 'Maven/Gradle',
        aliases: ['maven', 'gradle'],
        adjacentAliases: ['java', 'build automation', 'ci/cd'],
        placements: ['skills'],
        priority: 'core',
      },
    ],
  },
  {
    id: 'dotnet_backend',
    label: '.NET Backend',
    detection: [/\b\.net\b/i, /\basp\.net\b/i, /\bc#\b/i],
    roleEvidenceAliases: ['.net', 'asp.net', 'c#', 'entity framework', 'sql server', 'web api'],
    requirements: [
      { id: 'dotnet', label: '.NET', aliases: ['.net', '.net core', 'asp.net core'], placements: ['skills', 'headline_summary', 'latest_experience'], priority: 'core' },
      { id: 'csharp', label: 'C#', aliases: ['c#', 'c sharp'], placements: ['skills', 'latest_experience'], priority: 'core' },
      { id: 'web_api', label: 'Web API', aliases: ['web api', 'rest api', 'rest apis'], placements: ['skills', 'latest_experience'], priority: 'core' },
    ],
  },
  {
    id: 'react_frontend',
    label: 'React Frontend',
    detection: [/\breact\b/i, /\breact\.js\b/i, /\breactjs\b/i],
    roleEvidenceAliases: ['react', 'javascript', 'typescript', 'frontend', 'ui', 'html', 'css'],
    requirements: [
      { id: 'react', label: 'React', aliases: ['react', 'react.js', 'reactjs'], placements: ['skills', 'headline_summary', 'latest_experience'], priority: 'core' },
      { id: 'typescript', label: 'TypeScript', aliases: ['typescript', 'javascript'], placements: ['skills', 'latest_experience'], priority: 'core' },
      { id: 'frontend_testing', label: 'Frontend Testing', aliases: ['jest', 'react testing library', 'unit testing'], placements: ['skills'], priority: 'supporting' },
    ],
  },
  {
    id: 'python_data',
    label: 'Python/Data',
    detection: [/\bpython\b/i, /\bdata engineer\b/i, /\bmachine learning\b/i, /\bml engineer\b/i],
    roleEvidenceAliases: ['python', 'sql', 'pandas', 'numpy', 'spark', 'airflow', 'machine learning'],
    requirements: [
      { id: 'python', label: 'Python', aliases: ['python'], placements: ['skills', 'headline_summary', 'latest_experience'], priority: 'core' },
      { id: 'sql', label: 'SQL', aliases: ['sql', 'postgresql', 'mysql'], placements: ['skills'], priority: 'core' },
      { id: 'data_pipelines', label: 'Data Pipelines', aliases: ['data pipelines', 'etl', 'airflow', 'spark'], placements: ['skills', 'latest_experience'], priority: 'core' },
    ],
  },
  {
    id: 'cloud_devops',
    label: 'Cloud/DevOps',
    detection: [/\bdevops\b/i, /\bcloud engineer\b/i, /\bsre\b/i, /\bkubernetes\b/i, /\bterraform\b/i],
    roleEvidenceAliases: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd'],
    requirements: [
      { id: 'cloud', label: 'Cloud Platforms', aliases: ['aws', 'azure', 'gcp', 'cloud'], placements: ['skills', 'headline_summary'], priority: 'core' },
      { id: 'containers', label: 'Docker/Kubernetes', aliases: ['docker', 'kubernetes', 'k8s'], placements: ['skills', 'latest_experience'], priority: 'core' },
      { id: 'iac_cicd', label: 'IaC/CI/CD', aliases: ['terraform', 'ci/cd', 'jenkins', 'github actions'], placements: ['skills'], priority: 'core' },
    ],
  },
];

const EXPLICIT_SKILL_CATALOG = [
  { id: 'kafka', label: 'Kafka', aliases: ['kafka', 'apache kafka'] },
  { id: 'aws', label: 'AWS', aliases: ['aws', 'amazon web services'] },
  { id: 'azure', label: 'Azure', aliases: ['azure'] },
  { id: 'gcp', label: 'GCP', aliases: ['gcp', 'google cloud'] },
  { id: 'docker', label: 'Docker', aliases: ['docker'] },
  { id: 'kubernetes', label: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { id: 'jenkins', label: 'Jenkins', aliases: ['jenkins'] },
  { id: 'ci_cd', label: 'CI/CD', aliases: ['ci/cd', 'continuous integration', 'continuous delivery'] },
  { id: 'mongodb', label: 'MongoDB', aliases: ['mongodb', 'mongo db'] },
  { id: 'redis', label: 'Redis', aliases: ['redis'] },
  { id: 'graphql', label: 'GraphQL', aliases: ['graphql'] },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termPattern(term) {
  const escaped = escapeRegExp(term);
  if (/^[a-z0-9]+$/i.test(term)) return new RegExp(`\\b${escaped}\\b`, 'i');
  return new RegExp(escaped, 'i');
}

function textIncludesTerm(text, term) {
  return termPattern(term).test(String(text || ''));
}

function textIncludesAny(text, aliases = []) {
  return aliases.some((alias) => textIncludesTerm(text, alias));
}

function mergeRequirement(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    aliases: Array.from(new Set([...(existing.aliases || []), ...(incoming.aliases || [])])),
    adjacentAliases: Array.from(new Set([...(existing.adjacentAliases || []), ...(incoming.adjacentAliases || [])])),
    placements: Array.from(new Set([...(existing.placements || []), ...(incoming.placements || [])])),
    sources: Array.from(new Set([...(existing.sources || []), ...(incoming.sources || [])])),
    source: existing.source === 'explicit_jd' || incoming.source === 'explicit_jd'
      ? 'explicit_jd'
      : (existing.source || incoming.source || 'role_default'),
  };
}

function normalizeRequirement(requirement, source) {
  return {
    required: true,
    priority: 'supporting',
    ...requirement,
    source,
    sources: [source],
    aliases: requirement.aliases || [requirement.label],
    adjacentAliases: requirement.adjacentAliases || [],
    placements: requirement.placements || ['skills'],
  };
}

function findMatchingFamily(targetText) {
  const text = String(targetText || '');
  return ROLE_FAMILIES.find((family) => family.detection.some((pattern) => pattern.test(text))) || null;
}

function buildTargetRoleContract(targetText = '') {
  const text = String(targetText || '');
  const family = findMatchingFamily(text);
  const requirements = new Map();

  if (family) {
    for (const requirement of family.requirements) {
      const normalized = normalizeRequirement(requirement, 'role_default');
      if (textIncludesAny(text, normalized.aliases)) {
        normalized.source = 'explicit_jd';
        normalized.sources = ['role_default', 'explicit_jd'];
      }
      requirements.set(requirement.id, normalized);
    }
  }

  for (const skill of EXPLICIT_SKILL_CATALOG) {
    if (!textIncludesAny(text, skill.aliases)) continue;
    const normalized = normalizeRequirement({
      ...skill,
      placements: ['skills'],
      priority: 'explicit',
    }, 'explicit_jd');
    requirements.set(skill.id, requirements.has(skill.id)
      ? mergeRequirement(requirements.get(skill.id), normalized)
      : normalized);
  }

  return {
    id: family ? family.id : 'general',
    label: family ? family.label : 'General Target Role',
    detected: !!family,
    policy: 'gate_review',
    targetText: text.slice(0, 2000),
    roleEvidenceAliases: family?.roleEvidenceAliases || [],
    requirements: Array.from(requirements.values()),
  };
}

function skillText(skills = {}) {
  return collectSkillTextParts(skills).join(' ');
}

function projectText(project = {}) {
  return [
    project?.name,
    project?.description,
    ...((project?.technologies) || []),
    ...((project?.highlights) || []),
  ].filter(Boolean).join(' ');
}

function experienceText(exp = {}) {
  return [
    exp?.position,
    exp?.company,
    exp?.location,
    exp?.environment,
    ...((exp?.highlights) || []),
  ].filter(Boolean).join(' ');
}

function flattenResumeText(resume = {}) {
  return [
    resume?.personalInfo?.title,
    resume?.summary,
    skillText(resume?.skills),
    ...((resume?.experience || []).map(experienceText)),
    ...((resume?.projects || []).map(projectText)),
    ...((resume?.certifications || []).flatMap((cert) => [cert?.name, cert?.issuer])),
  ].filter(Boolean).join(' ');
}

function buildEvidenceMatrix(baseResume = {}, targetContract = buildTargetRoleContract('')) {
  const resumeText = flattenResumeText(baseResume);
  const hasRoleFamilyEvidence = textIncludesAny(resumeText, targetContract.roleEvidenceAliases || []);

  const requirements = (targetContract.requirements || []).map((requirement) => {
    const exact = textIncludesAny(resumeText, requirement.aliases || []);
    const adjacent = textIncludesAny(resumeText, requirement.adjacentAliases || []);
    let evidence = EVIDENCE_LEVELS.UNSUPPORTED;

    if (exact) {
      evidence = EVIDENCE_LEVELS.EXPLICIT;
    } else if (requirement.source === 'role_default' && hasRoleFamilyEvidence) {
      evidence = EVIDENCE_LEVELS.ROLE_DEFAULT_UNVERIFIED;
    } else if (adjacent || hasRoleFamilyEvidence) {
      evidence = EVIDENCE_LEVELS.ADJACENT;
    }

    return {
      requirementId: requirement.id,
      label: requirement.label,
      evidence,
      source: requirement.source,
      required: requirement.required !== false,
      reason: evidence === EVIDENCE_LEVELS.EXPLICIT
        ? `${requirement.label} found in base resume`
        : evidence === EVIDENCE_LEVELS.ROLE_DEFAULT_UNVERIFIED
          ? `${requirement.label} is expected for ${targetContract.label} but was not directly found in the base resume`
          : evidence === EVIDENCE_LEVELS.ADJACENT
            ? `${requirement.label} has adjacent evidence in the base resume`
            : `${requirement.label} was not found in the base resume`,
    };
  });

  const warnings = requirements
    .filter((entry) => [
      EVIDENCE_LEVELS.ROLE_DEFAULT_UNVERIFIED,
      EVIDENCE_LEVELS.UNSUPPORTED,
    ].includes(entry.evidence))
    .map((entry) => entry.reason);

  return {
    contractId: targetContract.id,
    policy: targetContract.policy || 'gate_review',
    hasRoleFamilyEvidence,
    requirements,
    warnings,
  };
}

function getPlacementText(resume = {}, placement) {
  const experience = Array.isArray(resume?.experience) ? resume.experience : [];
  switch (placement) {
    case 'skills':
      return skillText(resume?.skills);
    case 'headline_summary':
      return [resume?.personalInfo?.title, resume?.summary].filter(Boolean).join(' ');
    case 'latest_experience':
      return experienceText(experience[0] || {});
    case 'experience':
      return experience.map(experienceText).join(' ');
    default:
      return flattenResumeText(resume);
  }
}

function validateTargetRoleContract(baseResume = {}, generatedResume = {}, targetContract = buildTargetRoleContract(''), evidenceMatrix = null) {
  const matrix = evidenceMatrix || buildEvidenceMatrix(baseResume, targetContract);
  const hardIssues = [];
  const coverageIssues = [];

  if (!targetContract.requirements.length) {
    return {
      ok: true,
      hardIssues,
      coverageIssues,
      evidenceWarnings: [],
      coverageReport: {
        contractId: targetContract.id,
        label: targetContract.label,
        requirements: [],
      },
    };
  }

  const evidenceById = new Map((matrix.requirements || []).map((entry) => [entry.requirementId, entry]));
  const reportRequirements = [];

  for (const requirement of targetContract.requirements || []) {
    if (requirement.required === false) continue;
    const placements = requirement.placements || ['skills'];
    const placementCoverage = {};
    const missingPlacements = [];

    for (const placement of placements) {
      const matched = textIncludesAny(getPlacementText(generatedResume, placement), requirement.aliases || []);
      placementCoverage[placement] = matched;
      if (!matched) missingPlacements.push(placement);
    }

    for (const placement of missingPlacements) {
      const issue = `${requirement.label} missing from ${PLACEMENT_LABELS[placement] || placement}`;
      coverageIssues.push(issue);
      hardIssues.push(`target contract: ${issue}`);
    }

    reportRequirements.push({
      id: requirement.id,
      label: requirement.label,
      source: requirement.source,
      priority: requirement.priority,
      evidence: evidenceById.get(requirement.id)?.evidence || EVIDENCE_LEVELS.UNSUPPORTED,
      placements: placementCoverage,
      satisfied: missingPlacements.length === 0,
    });
  }

  const evidenceWarnings = (matrix.warnings || []).filter(Boolean);

  return {
    ok: hardIssues.length === 0,
    hardIssues,
    coverageIssues,
    evidenceWarnings,
    coverageReport: {
      contractId: targetContract.id,
      label: targetContract.label,
      policy: targetContract.policy || 'gate_review',
      requirements: reportRequirements,
    },
  };
}

function buildTargetRoleContractInstructions(targetContract, evidenceMatrix) {
  if (!targetContract?.requirements?.length) return '';

  const placementLine = (requirement) => (
    `- ${requirement.label}: required in ${(requirement.placements || ['skills']).map((placement) => PLACEMENT_LABELS[placement] || placement).join(', ')}`
  );
  const evidenceLine = (entry) => `- ${entry.label}: ${entry.evidence} (${entry.reason})`;

  return `TARGET ROLE CONTRACT:
- Detected role family: ${targetContract.label} (${targetContract.id}).
- Gate + Review policy: generate role-default skills when needed, but keep them realistic and reviewable.
- The following requirements are deterministic validation gates:
${targetContract.requirements.map(placementLine).join('\n')}

EVIDENCE MATRIX:
${(evidenceMatrix?.requirements || []).map(evidenceLine).join('\n')}

WRITING CONTRACT:
- Place every requirement in its listed resume locations. If any placement is missing after generation, the resume will be repaired or blocked.
- For role_default_unverified requirements, include the skill naturally as a target-role assumption and avoid overstating unsupported certifications, dates, employers, or degrees.
- For Java backend roles, Spring Boot must appear in skills, title/summary, and latest experience even when the base resume did not mention it.`;
}

module.exports = {
  EVIDENCE_LEVELS,
  ROLE_FAMILIES,
  buildEvidenceMatrix,
  buildTargetRoleContract,
  buildTargetRoleContractInstructions,
  validateTargetRoleContract,
};
