const ACRONYMS = new Set([
  'AI', 'ML', 'AWS', 'GCP', 'API', 'APIS', 'SQL', 'NLP', 'LLM', 'RAG', 'MLOPS',
  'CI', 'CD', 'CRM', 'ERP', 'ETL', 'BI', 'QA', 'SRE', 'IOS', 'UI', 'UX',
]);

const TECH_CATALOG = [
  { name: 'AI_ML', patterns: [/\bAI\s*\/\s*ML\b/i, /\bmachine learning\b/i, /\bML\b/i] },
  { name: 'GenAI', patterns: [/\bGenAI\b/i, /\bgenerative AI\b/i] },
  { name: 'LLM', patterns: [/\bLLM(s)?\b/i, /\blarge language model/i] },
  { name: 'RAG', patterns: [/\bRAG\b/i, /\bretrieval augmented generation/i] },
  { name: 'Python', patterns: [/\bPython\b/i] },
  { name: 'AWS', patterns: [/\bAWS\b/i, /\bAmazon Web Services\b/i] },
  { name: 'Azure', patterns: [/\bAzure\b/i] },
  { name: 'GCP', patterns: [/\bGCP\b/i, /\bGoogle Cloud\b/i] },
  { name: 'Dot_Net', patterns: [/\b\.NET\b/i, /\bDot Net\b/i, /\bASP\.NET\b/i] },
  { name: 'Java', patterns: [/\bJava\b/i] },
  { name: 'JavaScript', patterns: [/\bJavaScript\b/i, /\bTypeScript\b/i] },
  { name: 'React', patterns: [/\bReact\b/i] },
  { name: 'Node_JS', patterns: [/\bNode\.js\b/i, /\bNodeJS\b/i] },
  { name: 'FastAPI', patterns: [/\bFastAPI\b/i] },
  { name: 'Docker', patterns: [/\bDocker\b/i] },
  { name: 'Kubernetes', patterns: [/\bKubernetes\b/i, /\bK8s\b/i] },
  { name: 'SQL', patterns: [/\bSQL\b/i, /\bPostgres\b/i, /\bPostgreSQL\b/i, /\bMySQL\b/i] },
  { name: 'Data', patterns: [/\bdata engineering\b/i, /\bdata platform\b/i] },
  { name: 'Healthcare', patterns: [/\bhealthcare\b/i, /\bhealth care\b/i, /\bHIPAA\b/i] },
  { name: 'Salesforce', patterns: [/\bSalesforce\b/i] },
  { name: 'ServiceNow', patterns: [/\bServiceNow\b/i] },
];

function normalizeSpecialTerms(value) {
  return String(value || '')
    .replace(/\bAI\s*\/\s*ML\b/gi, ' AI ML ')
    .replace(/\b\.NET\b/gi, ' Dot Net ')
    .replace(/\bASP\.NET\b/gi, ' ASP Dot Net ')
    .replace(/\bC#\b/gi, ' C Sharp ')
    .replace(/\bC\+\+\b/gi, ' C Plus Plus ')
    .replace(/\bNode\.js\b/gi, ' Node JS ')
    .replace(/\bCI\s*\/\s*CD\b/gi, ' CI CD ');
}

function titleToken(token) {
  const upper = token.toUpperCase();
  if (ACRONYMS.has(upper)) return upper === 'APIS' ? 'API' : upper;
  if (/^\d+$/.test(token)) return token;
  return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
}

function tokenizeNamePart(value) {
  return normalizeSpecialTerms(value)
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !['with', 'using', 'for', 'and', 'the', 'a', 'an', 'to'].includes(token.toLowerCase()))
    .map(titleToken);
}

function compactName(tokens) {
  return tokens
    .join('_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function cleanRoleTitle(value) {
  const title = String(value || '').split(/\s+(?:with|using|for)\s+/i)[0].split(/\s+-\s+/)[0];
  return title.trim();
}

function collectText(generatedResumeData = {}, jobDescription = '') {
  const skills = generatedResumeData.skills || {};
  const skillText = Array.isArray(skills)
    ? skills.flatMap((entry) => [entry?.label, ...(entry?.items || [])]).join(' ')
    : Object.entries(skills).flatMap(([label, items]) => [label, ...(Array.isArray(items) ? items : [])]).join(' ');

  return [
    generatedResumeData.metadata?.targetPersonaTitle,
    ...(generatedResumeData.metadata?.atsKeywordsCovered || []),
    generatedResumeData.personalInfo?.title,
    generatedResumeData.summary,
    skillText,
    jobDescription,
  ].filter(Boolean).join(' ');
}

function extractTechTokens(generatedResumeData, jobDescription, roleName, maxTech = 3) {
  const text = collectText(generatedResumeData, jobDescription);
  const roleLower = String(roleName || '').toLowerCase();
  const matches = [];

  for (const item of TECH_CATALOG) {
    if (roleLower.includes(item.name.toLowerCase())) continue;
    if (item.patterns.some((pattern) => pattern.test(text))) matches.push(item.name);
    if (matches.length >= maxTech) break;
  }

  return matches;
}

export function buildStandardResumeName({
  sourceName = '',
  mode = 'optimize',
  generatedResumeData = {},
  jobDescription = '',
  maxTech = 3,
} = {}) {
  const roleTitle = cleanRoleTitle(
    generatedResumeData.metadata?.targetPersonaTitle
      || generatedResumeData.personalInfo?.title
      || sourceName
      || (mode === 'transform' ? 'Transformed Resume' : 'Optimized Resume')
  );
  const roleTokens = tokenizeNamePart(roleTitle).slice(0, 5);
  const roleName = compactName(roleTokens);
  const techTokens = extractTechTokens(generatedResumeData, jobDescription, roleName, maxTech);
  const name = compactName([...roleTokens, ...techTokens]);
  return name || (mode === 'transform' ? 'Transformed_Resume' : 'Optimized_Resume');
}
