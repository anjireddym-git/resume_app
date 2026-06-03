const APPLICATION_PIPELINE_STATUSES = Object.freeze([
  'awaiting_reply',
  'follow_up_due',
  'replied',
  'interviewing',
  'rejected',
  'closed',
  'archived',
]);

const REPLY_CATEGORIES = Object.freeze([
  'positive',
  'neutral',
  'rejection',
  'auto-reply',
  'recruiter-follow-up',
]);

const REPLY_ACTIONS = Object.freeze([
  'draft_reply',
  'schedule_interview',
  'snooze',
  'stop_followups',
  'wait',
  'close_rejected',
]);

const asString = (value, max = 4000) => String(value ?? '').trim().slice(0, max);

const asStringArray = (value, maxItems = 20, maxChars = 160) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
};

const normalizeEnum = (value, allowed, fallback) => (
  allowed.includes(value) ? value : fallback
);

const normalizeInsightMeta = (meta = {}) => ({
  model: asString(meta.model, 120),
  provider: asString(meta.provider, 40),
  generatedAt: asString(meta.generatedAt, 80),
  source: asString(meta.source || 'ai', 80),
  version: asString(meta.version || 'v1', 20),
});

function normalizeJdAnalysis(raw = {}, meta = {}) {
  return {
    roleTitle: asString(raw.roleTitle || raw.title, 160),
    company: asString(raw.company, 160),
    seniority: asString(raw.seniority, 80),
    location: asString(raw.location, 160),
    workMode: normalizeEnum(raw.workMode, ['remote', 'hybrid', 'onsite', 'unknown'], 'unknown'),
    employmentType: asString(raw.employmentType, 80),
    requiredSkills: asStringArray(raw.requiredSkills, 35, 120),
    preferredSkills: asStringArray(raw.preferredSkills, 35, 120),
    responsibilities: asStringArray(raw.responsibilities, 30, 220),
    keywords: asStringArray(raw.keywords, 50, 80),
    missingSignals: asStringArray(raw.missingSignals, 12, 180),
    summary: asString(raw.summary, 800),
    meta: normalizeInsightMeta(meta),
  };
}

function normalizeResumeDiff(raw = {}, meta = {}) {
  const sectionChanges = Array.isArray(raw.sectionChanges) ? raw.sectionChanges : [];
  return {
    headline: asString(raw.headline, 220),
    overallSummary: asString(raw.overallSummary || raw.summary, 1200),
    keyChanges: asStringArray(raw.keyChanges, 20, 220),
    jdReasons: asStringArray(raw.jdReasons, 20, 220),
    unsupportedClaimWarnings: asStringArray(raw.unsupportedClaimWarnings, 20, 220),
    sectionChanges: sectionChanges.slice(0, 40).map((item) => ({
      section: asString(item?.section, 80),
      before: asString(item?.before, 700),
      after: asString(item?.after, 700),
      reason: asString(item?.reason, 260),
    })).filter((item) => item.section || item.before || item.after || item.reason),
    meta: normalizeInsightMeta(meta),
  };
}

function normalizeInterviewPrep(raw = {}, meta = {}) {
  return {
    pitch30Second: asString(raw.pitch30Second, 900),
    pitch2Minute: asString(raw.pitch2Minute, 1800),
    roleFitTalkingPoints: asStringArray(raw.roleFitTalkingPoints, 12, 260),
    technicalQuestions: asStringArray(raw.technicalQuestions, 18, 260),
    behavioralQuestions: asStringArray(raw.behavioralQuestions, 14, 260),
    starStories: asStringArray(raw.starStories, 14, 320),
    resumeRiskQuestions: asStringArray(raw.resumeRiskQuestions, 12, 260),
    questionsToAsk: asStringArray(raw.questionsToAsk, 10, 260),
    closingStatement: asString(raw.closingStatement, 700),
    meta: normalizeInsightMeta(meta),
  };
}

function normalizeReplyInsight(raw = {}, meta = {}) {
  const category = normalizeEnum(raw.category, REPLY_CATEGORIES, 'neutral');
  let recommendedAction = normalizeEnum(raw.recommendedAction, REPLY_ACTIONS, 'wait');
  if (category === 'rejection') recommendedAction = 'close_rejected';
  if (category === 'auto-reply' && recommendedAction === 'wait') recommendedAction = 'snooze';
  if (category === 'positive' && recommendedAction === 'wait') recommendedAction = 'draft_reply';
  if (category === 'recruiter-follow-up' && recommendedAction === 'wait') recommendedAction = 'draft_reply';

  return {
    category,
    confidence: Math.max(0, Math.min(100, Number(raw.confidence || 0))),
    recommendedAction,
    rationale: asString(raw.rationale, 500),
    suggestedTone: asString(raw.suggestedTone, 80),
    followUpSuppressionReason: asString(raw.followUpSuppressionReason, 120),
    meta: normalizeInsightMeta(meta),
  };
}

function derivePipelineStatusFromApplication(app = {}) {
  if (app.pipelineStatusOverride) return app.pipelineStatusOverride;
  const category = app.replyInsights?.category;
  if (category === 'rejection') return 'rejected';
  if (category === 'positive' || category === 'recruiter-follow-up') return 'replied';
  if ((app.replyCount || 0) > 0) return 'replied';
  if (app.followUp?.suppressedReason === 'max-reached') return 'closed';
  if (app.followUp?.nextDueAt) {
    const dueMillis = typeof app.followUp.nextDueAt.toMillis === 'function'
      ? app.followUp.nextDueAt.toMillis()
      : new Date(app.followUp.nextDueAt).getTime();
    if (Number.isFinite(dueMillis) && dueMillis <= Date.now()) return 'follow_up_due';
  }
  return 'awaiting_reply';
}

function buildInsightMeta({ provider = '', model = '', source = 'ai', version = 'v1' } = {}) {
  return {
    provider,
    model,
    source,
    version,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  APPLICATION_PIPELINE_STATUSES,
  REPLY_ACTIONS,
  REPLY_CATEGORIES,
  asStringArray,
  buildInsightMeta,
  derivePipelineStatusFromApplication,
  normalizeInterviewPrep,
  normalizeJdAnalysis,
  normalizeReplyInsight,
  normalizeResumeDiff,
};
