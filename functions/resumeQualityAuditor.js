const {
  normalizeSkillCategories,
} = require('./resumeSkillCategories');

const QUALITY_CONFIG = Object.freeze({
  repeatedSkeletonThreshold: 3,
  repeatedEndingThreshold: 3,
  maxTechTermsPerBullet: 8,
  targetScore: 82,
});

const QUALITY_ISSUE_PATTERNS = Object.freeze({
  repairableSoft: /quality:|bullet|generic|repeated|same-voice|tool-stuffed|metric|skill order|role coherence|target stack|same target stack|similarity|opening phrase|sentence template|delivery verb/i,
});

const JAVA_CORE_CATEGORY_PATTERNS = [
  /\bjava\b/i,
  /\bspring\b/i,
  /\bbackend\b/i,
];

const JAVA_SUPPORT_CATEGORY_PATTERNS = [
  /\baws\b/i,
  /\bcloud\b/i,
  /\bdevops\b/i,
  /\btool/i,
  /\bdatabase/i,
  /\bobservability\b/i,
  /\bquality\b/i,
  /\blanguage/i,
];

const OFF_TARGET_JAVA_PATTERNS = [
  /\bai\b/i,
  /\bml\b/i,
  /\bgenai\b/i,
  /\bmachine learning\b/i,
  /\bmlops\b/i,
  /\bpython\b/i,
  /\bdata librar/i,
];

const AI_TARGET_PATTERNS = [
  /\bai\b/i,
  /\bml\b/i,
  /\bgenai\b/i,
  /\bmachine learning\b/i,
  /\bopenai\b/i,
  /\bllm\b/i,
  /\brag\b/i,
  /\bpython\b/i,
  /\bdata engineer\b/i,
  /\bdata scientist\b/i,
];

const TECH_TERMS = [
  'java', 'spring boot', 'spring framework', 'spring', 'rest api', 'rest apis',
  'microservices', 'hibernate', 'jpa', 'junit', 'maven', 'gradle', 'aws',
  'terraform', 'chef', 'docker', 'kubernetes', 'jenkins', 'github actions',
  'ci/cd', 'python', 'fastapi', 'flask', 'django', 'pandas', 'numpy',
  'openai', 'llm', 'rag', 'sql', 'postgresql', 'mysql', 'oracle', 'kafka',
  'cloudwatch', 'datadog', 'dynatrace', 'elk', 'splunk', 'lambda', 's3',
  'dynamodb', 'ecs', 'api gateway',
];

const GENERIC_PHRASES = [
  'enterprise workflows',
  'enterprise settings',
  'operational stability',
  'release confidence',
  'manual effort',
  'support handoffs',
  'business logic',
  'regulated releases',
  'daily operational tasks',
  'predictable operational behavior',
  'clearer monitoring',
  'late-night surprises',
  'delivery outcomes',
  'platform capability',
  'keep teams moving',
  'moving without adding unnecessary complexity',
];

const GENERIC_ENDINGS = [
  'operational stability',
  'release confidence',
  'manual effort',
  'support handoffs',
  'production operations',
  'delivery outcomes',
  'shared environments',
  'release support',
  'enterprise applications',
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termPattern(term) {
  const escaped = escapeRegExp(term);
  if (/^[a-z0-9]+$/i.test(term)) return new RegExp(`\\b${escaped}\\b`, 'i');
  return new RegExp(escaped, 'i');
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getSkillEntries(skills = {}) {
  if (Array.isArray(skills)) {
    return skills
      .map((entry) => ({
        label: String(entry?.label || entry?.category || entry?.name || '').trim(),
        items: Array.isArray(entry?.items) ? entry.items.filter(Boolean) : [],
      }))
      .filter((entry) => entry.label);
  }

  return Object.entries(skills || {})
    .map(([label, items]) => ({
      label,
      items: Array.isArray(items) ? items.filter(Boolean) : [],
    }))
    .filter((entry) => entry.label);
}

function entriesToSkillObject(entries = []) {
  const normalized = {};
  for (const entry of entries) {
    if (!entry?.label) continue;
    normalized[entry.label] = Array.isArray(entry.items) ? entry.items : [];
  }
  return normalizeSkillCategories(normalized);
}

function categoryMatches(label, patterns) {
  return patterns.some((pattern) => pattern.test(String(label || '')));
}

function isJavaBackendTarget(targetContract = {}) {
  return targetContract?.id === 'java_backend';
}

function targetAsksForAi(targetText = '') {
  return AI_TARGET_PATTERNS.some((pattern) => pattern.test(String(targetText || '')));
}

function rankJavaSkillCategory(entry, asksForAi = false) {
  const label = entry?.label || '';
  if (categoryMatches(label, JAVA_CORE_CATEGORY_PATTERNS)) return 0;
  if (/\baws\b|\bcloud\b/i.test(label)) return 1;
  if (/\bdevops\b|\btool/i.test(label)) return 2;
  if (/\bdatabase/i.test(label)) return 3;
  if (/\bobservability\b|\bquality\b/i.test(label)) return 4;
  if (/\blanguage/i.test(label)) return 5;
  if (!asksForAi && categoryMatches(label, OFF_TARGET_JAVA_PATTERNS)) return 9;
  return 6;
}

function reorderSkillsForTarget(skills = {}, targetContract = {}, targetText = '') {
  const entries = getSkillEntries(skills);
  if (!isJavaBackendTarget(targetContract)) return skills;
  const asksForAi = targetAsksForAi(targetText);
  const ranked = entries.map((entry, originalIndex) => ({
    ...entry,
    originalIndex,
    rank: rankJavaSkillCategory(entry, asksForAi),
  }));
  ranked.sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex);
  return entriesToSkillObject(ranked);
}

function skillOrderAudit(generated = {}, targetContract = {}, targetText = '') {
  const hardIssues = [];
  const warnings = [];
  const repairOps = [];
  const entries = getSkillEntries(generated.skills);
  const asksForAi = targetAsksForAi(targetText);
  if (!isJavaBackendTarget(targetContract) || entries.length === 0) {
    return {
      hardIssues,
      warnings,
      repairOps,
      report: {
        targetContractId: targetContract?.id || 'general',
        targetAsksForAi: asksForAi,
        skillCategoryOrder: entries.map((entry) => entry.label),
        offTargetCategoriesBeforeCore: [],
      },
    };
  }

  const coreIndex = entries.findIndex((entry) => categoryMatches(entry.label, JAVA_CORE_CATEGORY_PATTERNS));
  const offTargetBeforeCore = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry, index }) => !asksForAi && categoryMatches(entry.label, OFF_TARGET_JAVA_PATTERNS) && (coreIndex === -1 || index < coreIndex));

  if (coreIndex !== 0) {
    hardIssues.push('quality: Java Backend skill category must be first for Java backend resumes');
    repairOps.push({ type: 'reorder_skills', reason: 'Move Java Backend and supporting backend categories ahead of AI/ML/Python categories.' });
  }

  if (offTargetBeforeCore.length > 0) {
    hardIssues.push(`quality: off-target skill categories appear before Java Backend: ${offTargetBeforeCore.map(({ entry }) => entry.label).join(', ')}`);
    repairOps.push({ type: 'demote_off_target_skills', reason: 'Demote AI/ML/Python categories unless the JD explicitly asks for them.' });
  }

  return {
    hardIssues,
    warnings,
    repairOps,
    report: {
      targetContractId: targetContract?.id || 'general',
      targetAsksForAi: asksForAi,
      skillCategoryOrder: entries.map((entry) => entry.label),
      dominantSkillCategory: entries[0]?.label || '',
      targetCategoryIndex: coreIndex,
      offTargetCategoriesBeforeCore: offTargetBeforeCore.map(({ entry }) => entry.label),
    },
  };
}

function collectBullets(resume = {}) {
  const bullets = [];
  (Array.isArray(resume.experience) ? resume.experience : []).forEach((exp, expIndex) => {
    (Array.isArray(exp?.highlights) ? exp.highlights : []).forEach((text, highlightIndex) => {
      if (!String(text || '').trim()) return;
      bullets.push({
        section: 'experience',
        expIndex,
        highlightIndex,
        company: exp?.company || `experience[${expIndex}]`,
        path: `experience[${expIndex}].highlights[${highlightIndex}]`,
        text: String(text),
      });
    });
  });
  (Array.isArray(resume.projects) ? resume.projects : []).forEach((project, projectIndex) => {
    (Array.isArray(project?.highlights) ? project.highlights : []).forEach((text, highlightIndex) => {
      if (!String(text || '').trim()) return;
      bullets.push({
        section: 'projects',
        projectIndex,
        highlightIndex,
        company: project?.name || `project[${projectIndex}]`,
        path: `projects[${projectIndex}].highlights[${highlightIndex}]`,
        text: String(text),
      });
    });
  });
  return bullets;
}

function normalizeSkeleton(text = '') {
  let value = normalizeText(text)
    .replace(/[$]?\d+(?:\.\d+)?%?/g, '#')
    .replace(/\b\d+\s*-\s*\d+%?\b/g, '#-#');
  for (const term of TECH_TERMS) {
    value = value.replace(termPattern(term), '<tech>');
  }
  return value
    .replace(/\b(services?|adapters?|modules?|components?|workflows?|pipelines?|utilities)\b/g, '<thing>')
    .replace(/\b(release|deployment|support|container|readiness)\b/g, '<context>')
    .replace(/[^a-z0-9#<> ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 14)
    .join(' ');
}

function endingPhrase(text = '') {
  const normalized = normalizeText(text).replace(/[^a-z0-9 ]+/g, ' ');
  for (const ending of GENERIC_ENDINGS) {
    if (normalized.includes(ending)) return ending;
  }
  return normalized.split(/\s+/).filter(Boolean).slice(-5).join(' ');
}

function countTechTerms(text = '') {
  return TECH_TERMS.reduce((count, term) => count + (termPattern(term).test(text) ? 1 : 0), 0);
}

function isToolStackedBullet(text = '') {
  const lower = normalizeText(text);
  return countTechTerms(lower) >= QUALITY_CONFIG.maxTechTermsPerBullet
    || /^delivered features using\b/i.test(lower)
    || /\busing\s+([a-z0-9+#/.]+\s*,\s*){6,}/i.test(lower);
}

function auditBulletRealism(generated = {}) {
  const hardIssues = [];
  const warnings = [];
  const repairOps = [];
  const bullets = collectBullets(generated);
  const skeletonCounts = new Map();
  const endingCounts = new Map();

  for (const bullet of bullets) {
    const skeleton = normalizeSkeleton(bullet.text);
    if (skeleton) {
      if (!skeletonCounts.has(skeleton)) skeletonCounts.set(skeleton, []);
      skeletonCounts.get(skeleton).push(bullet);
    }

    const ending = endingPhrase(bullet.text);
    if (ending) {
      if (!endingCounts.has(ending)) endingCounts.set(ending, []);
      endingCounts.get(ending).push(bullet);
    }

    const genericHits = GENERIC_PHRASES.filter((phrase) => normalizeText(bullet.text).includes(phrase));
    if (genericHits.length > 0) {
      warnings.push(`quality: generic phrasing at ${bullet.path}: ${genericHits.join(', ')}`);
      repairOps.push({ type: 'rewrite_bullet', path: bullet.path, expIndex: bullet.expIndex, highlightIndex: bullet.highlightIndex, reason: `Replace generic phrase(s): ${genericHits.join(', ')}` });
    }

    if (isToolStackedBullet(bullet.text)) {
      hardIssues.push(`quality: tool-stuffed bullet at ${bullet.path}`);
      repairOps.push({ type: 'rewrite_bullet', path: bullet.path, expIndex: bullet.expIndex, highlightIndex: bullet.highlightIndex, reason: 'Reduce tool list and add a distinct work story/outcome.' });
    }
  }

  for (const [skeleton, matches] of skeletonCounts.entries()) {
    if (matches.length >= QUALITY_CONFIG.repeatedSkeletonThreshold) {
      warnings.push(`quality: repeated bullet structure appears ${matches.length} times: "${skeleton}"`);
      matches.slice(1).forEach((bullet) => {
        repairOps.push({ type: 'rewrite_bullet', path: bullet.path, expIndex: bullet.expIndex, highlightIndex: bullet.highlightIndex, reason: 'Rewrite repeated sentence structure with a distinct work story.' });
      });
    }
  }

  for (const [ending, matches] of endingCounts.entries()) {
    if (matches.length >= QUALITY_CONFIG.repeatedEndingThreshold && GENERIC_ENDINGS.includes(ending)) {
      warnings.push(`quality: same-voice ending "${ending}" appears ${matches.length} times`);
      matches.slice(1).forEach((bullet) => {
        repairOps.push({ type: 'rewrite_bullet', path: bullet.path, expIndex: bullet.expIndex, highlightIndex: bullet.highlightIndex, reason: `Avoid repeated ending "${ending}".` });
      });
    }
  }

  return { hardIssues, warnings, repairOps };
}

function flattenResumeText(resume = {}) {
  return [
    resume.personalInfo?.title,
    resume.summary,
    ...getSkillEntries(resume.skills).flatMap((entry) => [entry.label, ...entry.items]),
    ...collectBullets(resume).map((bullet) => bullet.text),
  ].filter(Boolean).join(' ');
}

function findMetricTokens(text = '') {
  const tokens = [];
  const patterns = [
    /[$]\s?\d+(?:\.\d+)?\s?[kmb]?/gi,
    /\b\d+(?:\.\d+)?%/g,
    /\b\d+(?:\.\d+)?\s*(?:x|ms|seconds?|minutes?|hours?|days?|services?|apis?|users?|records?|requests?|teams?|engineers?|months?|years?)\b/gi,
    /\b\d+\s*-\s*\d+%/g,
    /\b\d+\s*-\s*\d+\s*(?:services?|apis?|teams?|engineers?|environments?|systems?)\b/gi,
    /\b99\.9+% uptime\b/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(String(text || ''))) !== null) {
      tokens.push(match[0].trim());
    }
  }
  return Array.from(new Set(tokens));
}

function isConservativeMetric(token = '') {
  const value = String(token || '').toLowerCase();
  return /\b\d+\s*-\s*\d+/.test(value)
    || /\bthousands of\b/.test(value)
    || /\bmulti-(?:team|environment|service|region)\b/.test(value)
    || /\bseveral\b|\bmultiple\b/.test(value);
}

function isFakePreciseMetric(token = '') {
  const value = String(token || '').toLowerCase();
  if (/99\.9+% uptime/.test(value)) return true;
  const pct = value.match(/\b(\d+(?:\.\d+)?)%/);
  if (pct && !/\d+\s*-\s*\d+%/.test(value)) {
    const number = Number(pct[1]);
    return !Number.isNaN(number) && number % 5 !== 0;
  }
  if (/[$]/.test(value)) return true;
  if (/\b\d+\s*(?:services?|apis?|users?|records?|requests?|teams?|engineers?)\b/.test(value) && !/\b\d+\s*-\s*\d+/.test(value)) return true;
  return false;
}

function auditMetrics(original = {}, generated = {}) {
  const hardIssues = [];
  const warnings = [];
  const repairOps = [];
  const metricAssumptions = [];
  const claimRiskReport = [];
  const sourceText = normalizeText(flattenResumeText(original));

  for (const bullet of collectBullets(generated)) {
    for (const token of findMetricTokens(bullet.text)) {
      const normalizedToken = normalizeText(token);
      const sourceHasMetric = normalizedToken && sourceText.includes(normalizedToken);
      if (sourceHasMetric) {
        claimRiskReport.push({ path: bullet.path, type: 'direct', claim: token, reason: 'Metric appears in source resume.' });
        continue;
      }

      if (isConservativeMetric(token)) {
        warnings.push(`quality: plausible metric assumption at ${bullet.path}: ${token}`);
        metricAssumptions.push({ path: bullet.path, metric: token, reason: 'Conservative generated range not found in source resume.' });
        claimRiskReport.push({ path: bullet.path, type: 'plausible_metric_assumption', claim: token, reason: 'Allowed conservative range; review recommended.' });
      } else if (isFakePreciseMetric(token)) {
        hardIssues.push(`quality: unsupported precise metric at ${bullet.path}: ${token}`);
        claimRiskReport.push({ path: bullet.path, type: 'risky', claim: token, reason: 'Precise metric was not present in source evidence.' });
        repairOps.push({ type: 'soften_metric', path: bullet.path, expIndex: bullet.expIndex, highlightIndex: bullet.highlightIndex, reason: `Replace unsupported precise metric "${token}" with a conservative range or non-numeric impact.` });
      }
    }
  }

  return { hardIssues, warnings, repairOps, metricAssumptions, claimRiskReport };
}

function buildQualityRepairPlan(parts = []) {
  const seen = new Set();
  const operations = [];
  for (const part of parts) {
    for (const op of part.repairOps || []) {
      const key = `${op.type}:${op.path || 'skills'}:${op.reason || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      operations.push(op);
    }
  }
  return { operations };
}

function computeQualityScore({ hardCount = 0, warningCount = 0 } = {}) {
  return Math.max(0, Math.min(100, 100 - (hardCount * 18) - (warningCount * 4)));
}

function auditResumeQuality(original = {}, generated = {}, targetText = '', targetContract = {}) {
  const skill = skillOrderAudit(generated, targetContract, targetText);
  const bullet = auditBulletRealism(generated);
  const metrics = auditMetrics(original, generated);
  const parts = [skill, bullet, metrics];
  const hardIssues = parts.flatMap((part) => part.hardIssues || []);
  const qualityWarnings = parts.flatMap((part) => part.warnings || []);
  const repairPlan = buildQualityRepairPlan(parts);
  const qualityScore = computeQualityScore({ hardCount: hardIssues.length, warningCount: qualityWarnings.length });

  return {
    ok: hardIssues.length === 0,
    qualityScore,
    hardIssues,
    softIssues: qualityWarnings,
    qualityIssues: hardIssues,
    qualityWarnings,
    roleCoherenceReport: skill.report,
    metricAssumptions: metrics.metricAssumptions,
    claimRiskReport: metrics.claimRiskReport,
    repairPlan,
  };
}

function applyDeterministicQualityRepairs(resume = {}, repairPlan = {}, targetContract = {}, targetText = '') {
  const operations = repairPlan?.operations || [];
  if (!operations.length) return resume;
  let repaired = {
    ...resume,
    skills: resume.skills,
    experience: Array.isArray(resume.experience)
      ? resume.experience.map((exp) => ({
        ...exp,
        highlights: Array.isArray(exp.highlights) ? [...exp.highlights] : exp.highlights,
      }))
      : resume.experience,
  };

  if (operations.some((op) => ['reorder_skills', 'demote_off_target_skills'].includes(op.type))) {
    repaired = {
      ...repaired,
      skills: reorderSkillsForTarget(repaired.skills, targetContract, targetText),
    };
  }

  for (const op of operations.filter((item) => item.type === 'soften_metric')) {
    if (typeof op.expIndex !== 'number' || typeof op.highlightIndex !== 'number') continue;
    const bullet = repaired.experience?.[op.expIndex]?.highlights?.[op.highlightIndex];
    if (!bullet) continue;
    repaired.experience[op.expIndex].highlights[op.highlightIndex] = softenUnsupportedMetricText(bullet);
  }

  return repaired;
}

function softenUnsupportedMetricText(text = '') {
  return String(text || '')
    .replace(/\b99\.9+% uptime\b/gi, 'high availability')
    .replace(/[$]\s?\d+(?:\.\d+)?\s?[kmb]?/gi, 'measurable cost impact')
    .replace(/\b(\d+)\s+(services|apis|users|records|requests|teams|engineers)\b/gi, (match, number, unit, offset, source) => {
      if (offset > 0 && source[offset - 1] === '-') return match;
      const n = Number(number);
      if (Number.isNaN(n)) return match;
      if (n <= 3) return `several ${unit}`;
      const lower = Math.max(1, Math.floor(n / 5) * 5);
      const upper = lower + 5;
      return `${lower}-${upper} ${unit}`;
    })
    .replace(/\b([1-9]\d?)%/g, (match, number) => {
      const n = Number(number);
      if (Number.isNaN(n) || n % 5 === 0) return match;
      const lower = Math.max(5, Math.floor(n / 10) * 10);
      const upper = lower + 10;
      return `${lower}-${upper}%`;
    });
}

function buildResumeQualityInstructions(targetContract = {}) {
  const roleLine = isJavaBackendTarget(targetContract)
    ? '- For Java backend resumes, lead with Java Backend skills; keep AI/ML, GenAI, Python/Data, and MLOps secondary unless the JD explicitly asks for them.'
    : '- Keep skill category order aligned to the detected target role.';

  return `RESUME QUALITY CONTRACT:
${roleLine}
- Dense resumes are allowed; do not reduce bullet count just to be concise.
- Avoid same-voice bullets. Vary systems, responsibilities, constraints, outcomes, and sentence structure across roles.
- Do not end many bullets with the same generic outcome such as operational stability, release confidence, or manual effort.
- Avoid tool-stuffed bullets that are mostly a technology list. Every bullet needs a distinct work story.
- Metrics policy: conservative plausible ranges are allowed when source evidence is thin, but avoid fake-precise claims such as 28%, $500K, 12 services, or 99.99% uptime unless present in the base resume.
- Prefer conservative phrasing such as 20-30%, 5-10 services, thousands of records, multi-environment releases, several APIs, or measurable operational improvement.`;
}

module.exports = {
  QUALITY_CONFIG,
  QUALITY_ISSUE_PATTERNS,
  applyDeterministicQualityRepairs,
  auditResumeQuality,
  buildResumeQualityInstructions,
  getSkillEntries,
  reorderSkillsForTarget,
  softenUnsupportedMetricText,
};
