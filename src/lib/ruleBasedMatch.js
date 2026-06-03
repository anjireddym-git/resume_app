const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'in', 'into', 'is', 'it', 'of', 'on', 'or', 'our', 'that', 'the', 'their',
  'this', 'to', 'with', 'you', 'your', 'we', 'will', 'work', 'working', 'role',
  'team', 'teams', 'job', 'description', 'candidate', 'experience', 'years',
  'skills', 'required', 'preferred', 'responsibilities', 'requirements',
]);

const NORMALIZERS = [
  [/\bnode\.js\b/g, 'nodejs'],
  [/\bnext\.js\b/g, 'nextjs'],
  [/\breact\.js\b/g, 'react'],
  [/\bvue\.js\b/g, 'vue'],
  [/c\+\+/g, 'cplusplus'],
  [/c#/g, 'csharp'],
  [/\bci\/cd\b/g, 'cicd'],
];

const ROLE_HINTS = new Set([
  'administrator', 'analyst', 'android', 'architect', 'backend', 'cloud',
  'data', 'database', 'devops', 'engineer', 'engineering', 'frontend', 'fullstack',
  'ios', 'java', 'lead', 'machine', 'manager', 'mobile', 'platform', 'product',
  'python', 'qa', 'react', 'security', 'senior', 'software', 'sre', 'staff',
]);

const normalizeText = (value = '') => {
  let text = String(value || '').toLowerCase();
  for (const [pattern, replacement] of NORMALIZERS) {
    text = text.replace(pattern, replacement);
  }
  return text;
};

export const tokenizeMatchText = (value = '') => {
  const tokens = normalizeText(value).match(/[a-z0-9][a-z0-9+#.-]{1,}/g) || [];
  return tokens
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9+#]+$/g, ''))
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
};

const resumeTextParts = (resume = {}) => {
  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  const skills = resume.skills || {};
  return [
    resume.personalInfo?.title,
    resume.summary,
    Array.isArray(skills)
      ? skills.flatMap((entry) => [entry?.label, ...(entry?.items || [])]).join(' ')
      : Object.entries(skills).flatMap(([label, items]) => [label, ...(Array.isArray(items) ? items : [items])]).join(' '),
    experience.flatMap((entry) => [
      entry?.position,
      entry?.company,
      ...(Array.isArray(entry?.highlights) ? entry.highlights : []),
    ]).join(' '),
    Object.values(resume.projects || {}).flat().join(' '),
    Object.values(resume.certifications || {}).flat().join(' '),
  ].filter(Boolean).join(' ');
};

const weightedKeywordMap = (jobDescription = '') => {
  const counts = new Map();
  for (const token of tokenizeMatchText(jobDescription)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([token, count]) => ({
      token,
      weight: Math.min(4, count) + (ROLE_HINTS.has(token) ? 1.5 : 0),
    }))
    .sort((a, b) => b.weight - a.weight || a.token.localeCompare(b.token))
    .slice(0, 35);
};

const coverage = (weightedKeywords, tokenSet) => {
  const total = weightedKeywords.reduce((sum, item) => sum + item.weight, 0);
  if (!total) return { ratio: 0, matched: [], missing: [] };

  const matched = [];
  const missing = [];
  const matchedWeight = weightedKeywords.reduce((sum, item) => {
    if (tokenSet.has(item.token)) {
      matched.push(item.token);
      return sum + item.weight;
    }
    missing.push(item.token);
    return sum;
  }, 0);

  return {
    ratio: matchedWeight / total,
    matched,
    missing,
  };
};

export const calculateRuleBasedMatch = (jobDescription = '', resume = {}) => {
  const weightedKeywords = weightedKeywordMap(jobDescription);
  if (weightedKeywords.length === 0) return null;

  const allResumeTokens = new Set(tokenizeMatchText(resumeTextParts(resume)));
  if (allResumeTokens.size === 0) return null;

  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  const recentExperienceText = experience.slice(0, 2).flatMap((entry) => [
    entry?.position,
    ...(Array.isArray(entry?.highlights) ? entry.highlights : []),
  ]).join(' ');
  const headlineText = [resume.personalInfo?.title, experience[0]?.position].filter(Boolean).join(' ');

  const overall = coverage(weightedKeywords, allResumeTokens);
  const recent = coverage(weightedKeywords, new Set(tokenizeMatchText(recentExperienceText)));
  const role = coverage(
    weightedKeywords.filter((item) => ROLE_HINTS.has(item.token)),
    new Set(tokenizeMatchText(headlineText)),
  );

  const rawScore = (overall.ratio * 68) + (recent.ratio * 22) + (role.ratio * 10);
  const score = Math.max(5, Math.min(98, Math.round(rawScore)));

  return {
    score,
    label: 'Rule-based estimate',
    matchedKeywords: overall.matched.slice(0, 8),
    missingKeywords: overall.missing.slice(0, 8),
    rules: [
      'JD keyword overlap',
      'headline and recent role alignment',
      'recent experience coverage',
    ],
  };
};

export const getRuleMatchToneClass = (score) => {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-neutral-100 text-neutral-600';
};
