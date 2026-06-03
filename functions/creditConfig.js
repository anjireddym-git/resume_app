const NANO_MODEL = 'gpt-5.4-nano';
const RESUME_GENERATION_CREDIT_COST = 1;
const SIGNUP_CREDIT_PLAN_ID = 'free';

const CREDIT_PLANS = Object.freeze({
  free: Object.freeze({
    id: 'free',
    name: 'Free',
    credits: 10,
    priceCents: 0,
    checkoutEnabled: false,
  }),
  starter: Object.freeze({
    id: 'starter',
    name: 'Starter',
    credits: 100,
    priceCents: 1900,
    checkoutEnabled: true,
  }),
  pro: Object.freeze({
    id: 'pro',
    name: 'Pro',
    credits: 400,
    priceCents: 4900,
    checkoutEnabled: true,
  }),
  career_accelerator: Object.freeze({
    id: 'career_accelerator',
    name: 'Career Accelerator',
    credits: 1000,
    priceCents: 9900,
    checkoutEnabled: true,
  }),
});

const CREDIT_PLAN_ORDER = Object.freeze([
  'free',
  'starter',
  'pro',
  'career_accelerator',
]);

const AI_ACTION_CREDIT_COSTS = Object.freeze({
  updateResumeForJob: 1,
  analyzeMatch: 0,
  generateSuggestions: 0,
  generateRefactoredHighlights: 0,
  transformResumeForRole: 1,
  extractResumeFromFile: 1,
  parseDocxToFieldMap: 1,
  editField: 0,
  generateRecruiterEmail: 0,
  draftFollowUpEmail: 0,
  classifyReplySentiment: 0,
});

const FREE_LIGHTWEIGHT_AI_ACTIONS = Object.freeze(
  Object.keys(AI_ACTION_CREDIT_COSTS).filter((action) => AI_ACTION_CREDIT_COSTS[action] === 0)
);

function getCreditPlan(planId) {
  const normalized = String(planId || '').trim().toLowerCase();
  return CREDIT_PLANS[normalized] || null;
}

function getPurchasableCreditPlans() {
  return CREDIT_PLAN_ORDER
    .map((planId) => CREDIT_PLANS[planId])
    .filter((plan) => plan.checkoutEnabled);
}

function getAiActionCreditCost(action) {
  if (!Object.prototype.hasOwnProperty.call(AI_ACTION_CREDIT_COSTS, action)) return null;
  return AI_ACTION_CREDIT_COSTS[action];
}

function getOutreachFlowCreditCost(flow = {}) {
  if (flow.mode === 'existing' || flow.resultResumeId) return 0;
  return RESUME_GENERATION_CREDIT_COST;
}

function shouldGrantSignupCredits(userData = null) {
  if (!userData) return true;
  if (Object.prototype.hasOwnProperty.call(userData, 'credits')) return false;
  return !userData.signupCreditGrantedAt;
}

function shouldApplyCheckoutCompletion(transactionData = null) {
  return !transactionData || transactionData.status !== 'completed';
}

module.exports = {
  AI_ACTION_CREDIT_COSTS,
  CREDIT_PLANS,
  CREDIT_PLAN_ORDER,
  FREE_LIGHTWEIGHT_AI_ACTIONS,
  NANO_MODEL,
  RESUME_GENERATION_CREDIT_COST,
  SIGNUP_CREDIT_PLAN_ID,
  getAiActionCreditCost,
  getCreditPlan,
  getOutreachFlowCreditCost,
  getPurchasableCreditPlans,
  shouldApplyCheckoutCompletion,
  shouldGrantSignupCredits,
};
