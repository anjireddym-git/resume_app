const AUTHENTICITY_CONFIG = Object.freeze({
  targetStackRoleSaturationRatio: 0.75,
  bulletSimilarityThreshold: 0.72,
  repeatedOpeningRatio: 0.35,
  repeatedVerbRatio: 0.38,
  repeatedSkeletonRatio: 0.3,
});

const STACK_FAMILIES = [
  {
    id: 'angular',
    label: 'Angular frontend',
    primary: ['angular', 'angularjs', 'rxjs', 'ngrx', 'angular material', 'angular universal', 'angular cli'],
    adjacent: ['typescript', 'javascript', 'react', 'react.js', 'next.js', 'vue', 'redux', 'webpack', 'vite', 'html', 'css', 'sass', 'tailwind', 'web components'],
  },
  {
    id: 'react',
    label: 'React frontend',
    primary: ['react', 'react.js', 'next.js', 'redux', 'react hooks', 'react query'],
    adjacent: ['typescript', 'javascript', 'angular', 'vue', 'webpack', 'vite', 'html', 'css', 'tailwind', 'node.js', 'graphql'],
  },
  {
    id: 'dotnet',
    label: '.NET backend',
    primary: ['.net', '.net core', 'asp.net', 'asp.net core', 'c#', 'entity framework', 'ef core'],
    adjacent: ['sql server', 'azure', 'web api', 'mvc', 'linq', 'microservices', 'rest api', 'xunit', 'nunit'],
  },
  {
    id: 'java',
    label: 'Java backend',
    primary: ['java', 'spring', 'spring boot', 'hibernate'],
    adjacent: ['maven', 'gradle', 'junit', 'microservices', 'rest api', 'kafka', 'aws', 'sql'],
  },
  {
    id: 'python_data',
    label: 'Python/data',
    primary: ['python', 'pandas', 'numpy', 'pytorch', 'tensorflow', 'scikit-learn', 'spark'],
    adjacent: ['fastapi', 'django', 'flask', 'airflow', 'kafka', 'sql', 'aws', 'gcp', 'azure'],
  },
  {
    id: 'cloud_devops',
    label: 'cloud/devops',
    primary: ['aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform', 'jenkins', 'ci/cd'],
    adjacent: ['linux', 'serverless', 'lambda', 'observability', 'monitoring', 'microservices', 'sre'],
  },
];

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on',
  'or', 'the', 'to', 'with', 'within', 'while', 'using', 'across', 'through', 'via',
  'that', 'this', 'these', 'those', 'their', 'teams', 'team',
]);

const DELIVERY_VERBS = new Set([
  'architected', 'built', 'created', 'delivered', 'designed', 'developed', 'engineered',
  'implemented', 'improved', 'integrated', 'led', 'migrated', 'optimized', 'reduced',
  'scaled', 'streamlined', 'transformed',
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termPattern(term) {
  const escaped = escapeRegExp(term);
  if (/^[a-z0-9]+$/i.test(term)) return new RegExp(`\\b${escaped}\\b`, 'i');
  return new RegExp(escaped, 'i');
}

function textIncludesAny(text, terms = []) {
  const source = String(text || '');
  return terms.some((term) => termPattern(term).test(source));
}

function skillText(skills = {}) {
  if (Array.isArray(skills)) {
    return skills.flatMap((entry) => [entry?.label, ...((entry?.items) || [])]).filter(Boolean).join(' ');
  }
  return Object.entries(skills || {})
    .flatMap(([label, items]) => [label, ...(Array.isArray(items) ? items : [])])
    .filter(Boolean)
    .join(' ');
}

function experienceText(exp = {}) {
  return [
    exp.company,
    exp.position,
    exp.location,
    exp.environment,
    ...((exp.highlights || [])),
  ].filter(Boolean).join(' ');
}

function resumeText(resume = {}) {
  return [
    resume.personalInfo?.title,
    resume.summary,
    skillText(resume.skills),
    ...((resume.experience || []).map(experienceText)),
    ...((resume.projects || []).flatMap((project) => [
      project?.name,
      project?.description,
      ...((project?.technologies) || []),
      ...((project?.highlights) || []),
    ])),
  ].filter(Boolean).join(' ');
}

function extractTargetStackFamilies(targetText = '') {
  return STACK_FAMILIES
    .filter((family) => textIncludesAny(targetText, family.primary))
    .map((family) => ({
      ...family,
      matchedPrimary: family.primary.filter((term) => termPattern(term).test(String(targetText || ''))),
    }));
}

function roleHasPrimaryStack(exp, family) {
  return textIncludesAny(experienceText(exp), family.primary);
}

function countRolesWithPrimaryStack(experience = [], family) {
  return (Array.isArray(experience) ? experience : []).filter((exp) => roleHasPrimaryStack(exp, family)).length;
}

function buildAuthenticityInstructions(baseResume = {}, targetText = '') {
  const families = extractTargetStackFamilies(targetText).slice(0, 2);
  const targetLine = families.length
    ? families.map((family) => `${family.label} (${family.matchedPrimary.slice(0, 4).join(', ') || family.primary[0]})`).join('; ')
    : 'the target role stack from the JD or role instruction';
  const adjacentLine = families.length
    ? families.map((family) => `${family.label}: adjacent/complementary stack can include ${family.adjacent.slice(0, 8).join(', ')}`).join('\n- ')
    : 'Use adjacent, predecessor, complementary, or integration technologies only when supported by the base resume context.';
  const experience = Array.isArray(baseResume.experience) ? baseResume.experience : [];
  const roleLine = experience.length
    ? experience.map((exp, index) => `- ${index === 0 ? 'Latest' : `Older role ${index}`}${exp?.company ? ` (${exp.company})` : ''}: assign a distinct stack emphasis and work story.`).join('\n')
    : '- Latest role: strongest target-stack emphasis.\n- Older roles: adjacent, legacy, integration, API, testing, cloud, data, migration, or platform work.';

  return `AUTHENTICITY AND CAREER-CHRONOLOGY STRATEGY:
- Target stack to emphasize: ${targetLine}.
- Before writing, silently create a per-role stack map. Do not output the map.
${roleLine}
- Latest experience should carry the densest JD-stack match.
- Previous roles should use evidence-backed adjacent, predecessor, complementary, migration, integration, backend/API, testing, cloud, data, or domain-specific work.
- Do not blanket-replace every experience with the target technology. Every company should not read like the same JD-template role unless the base resume clearly shows that stack in every role.
- Every bullet must have a distinct work story: different system, feature, responsibility, business context, technical constraint, collaboration pattern, metric, or operational outcome.
- Use exact JD technology names naturally, but vary chronology and supporting stacks so the resume feels like a real 8-10 year career.
- Adjacent stack guidance:
- ${adjacentLine}`;
}

function normalizeTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[$]?\d+(?:\.\d+)?%?/g, ' ')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^\.+|\.+$/g, ''))
    .map((token) => (token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function tokenSet(text) {
  return new Set(normalizeTokens(text));
}

function jaccardSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function openingPhrase(text, size = 4) {
  return normalizeTokens(text).slice(0, size).join(' ');
}

function bulletSkeleton(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[$]?\d+(?:\.\d+)?%?/g, '#')
    .replace(/\b(angular|react|next\.js|vue|typescript|javascript|java|python|\.net|aws|azure|gcp|sql|docker|kubernetes)\b/g, '<tech>')
    .replace(/[^a-z0-9#<> ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12)
    .join(' ');
}

function addDominantCountIssues(values, label, minItems, ratio, issues) {
  if (values.length < minItems) return;
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  for (const [value, count] of counts) {
    if (count >= Math.ceil(values.length * ratio)) {
      issues.push(`${label} repeats "${value}" across ${count}/${values.length} bullets`);
      return;
    }
  }
}

function validateBulletAuthenticity(experience = []) {
  const softIssues = [];
  const allBullets = [];
  (Array.isArray(experience) ? experience : []).forEach((exp, expIndex) => {
    const bullets = Array.isArray(exp?.highlights) ? exp.highlights.filter(Boolean) : [];
    allBullets.push(...bullets);
    const tokenSets = bullets.map(tokenSet);
    let similarityIssues = 0;
    for (let i = 0; i < tokenSets.length; i += 1) {
      for (let j = i + 1; j < tokenSets.length; j += 1) {
        const similarity = jaccardSimilarity(tokenSets[i], tokenSets[j]);
        if (similarity >= AUTHENTICITY_CONFIG.bulletSimilarityThreshold) {
          softIssues.push(`high bullet similarity at "${exp?.company || `experience[${expIndex}]`}": bullets ${i + 1} and ${j + 1} overlap ${Math.round(similarity * 100)}%`);
          similarityIssues += 1;
          if (similarityIssues >= 3) break;
        }
      }
      if (similarityIssues >= 3) break;
    }
    addDominantCountIssues(
      bullets.map((bullet) => openingPhrase(bullet)),
      `repeated opening phrase at "${exp?.company || `experience[${expIndex}]`}"`,
      8,
      AUTHENTICITY_CONFIG.repeatedOpeningRatio,
      softIssues
    );
    addDominantCountIssues(
      bullets.map(bulletSkeleton),
      `repeated sentence template at "${exp?.company || `experience[${expIndex}]`}"`,
      8,
      AUTHENTICITY_CONFIG.repeatedSkeletonRatio,
      softIssues
    );
  });

  addDominantCountIssues(
    allBullets.map((bullet) => normalizeTokens(bullet)[0]).filter((word) => DELIVERY_VERBS.has(word)),
    'repeated delivery verb across resume',
    20,
    AUTHENTICITY_CONFIG.repeatedVerbRatio,
    softIssues
  );

  return softIssues;
}

function validateStackDistribution(original = {}, generated = {}, targetText = '') {
  const softIssues = [];
  const families = extractTargetStackFamilies(targetText);
  if (!families.length) return softIssues;

  const originalExperience = Array.isArray(original.experience) ? original.experience : [];
  const generatedExperience = Array.isArray(generated.experience) ? generated.experience : [];
  const totalRoles = generatedExperience.length;
  const olderRoles = Math.max(0, totalRoles - 1);

  for (const family of families) {
    const generatedPrimaryRoles = countRolesWithPrimaryStack(generatedExperience, family);
    const originalPrimaryRoles = countRolesWithPrimaryStack(originalExperience, family);
    const generatedOlderPrimary = countRolesWithPrimaryStack(generatedExperience.slice(1), family);
    const originalOlderPrimary = countRolesWithPrimaryStack(originalExperience.slice(1), family);
    const originalHasAnyEvidence = textIncludesAny(resumeText(original), [...family.primary, ...family.adjacent]);

    if (
      totalRoles >= 3 &&
      generatedPrimaryRoles >= Math.max(3, Math.ceil(totalRoles * AUTHENTICITY_CONFIG.targetStackRoleSaturationRatio)) &&
      originalPrimaryRoles < generatedPrimaryRoles &&
      originalPrimaryRoles < Math.ceil(totalRoles * 0.6)
    ) {
      softIssues.push(`target stack overuse: ${family.label} appears as primary focus in ${generatedPrimaryRoles}/${totalRoles} roles without matching base evidence`);
    }

    if (
      olderRoles >= 2 &&
      generatedOlderPrimary === olderRoles &&
      originalOlderPrimary < olderRoles &&
      (!originalHasAnyEvidence || originalPrimaryRoles < totalRoles)
    ) {
      softIssues.push(`same target stack in every older role: ${family.label} appears in ${generatedOlderPrimary}/${olderRoles} older roles; diversify chronology with adjacent or transferable stack`);
    }
  }

  return softIssues;
}

function validateResumeAuthenticity(original = {}, generated = {}, targetText = '') {
  return {
    hardIssues: [],
    softIssues: [
      ...validateStackDistribution(original, generated, targetText),
      ...validateBulletAuthenticity(generated.experience || []),
    ],
  };
}

module.exports = {
  AUTHENTICITY_CONFIG,
  STACK_FAMILIES,
  buildAuthenticityInstructions,
  extractTargetStackFamilies,
  jaccardSimilarity,
  normalizeTokens,
  validateResumeAuthenticity,
};
