import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  CREDIT_PLANS,
  RESUME_GENERATION_CREDIT_COST,
  getAiActionCreditCost,
  getCreditPlan,
  getOutreachFlowCreditCost,
  getPurchasableCreditPlans,
  shouldApplyCheckoutCompletion,
  shouldGrantSignupCredits,
} = require('./creditConfig');

describe('credit config', () => {
  it('defines the signup grant and one-time purchase packs', () => {
    expect(CREDIT_PLANS.free).toMatchObject({ priceCents: 0, credits: 10, checkoutEnabled: false });
    expect(getCreditPlan('starter')).toMatchObject({ priceCents: 1900, credits: 100 });
    expect(getCreditPlan('pro')).toMatchObject({ priceCents: 4900, credits: 400 });
    expect(getCreditPlan('career_accelerator')).toMatchObject({ priceCents: 9900, credits: 1000 });
    expect(getPurchasableCreditPlans().map((plan) => plan.id)).toEqual([
      'starter',
      'pro',
      'career_accelerator',
    ]);
  });

  it('charges only resume generation and AI imports for callAI actions', () => {
    expect(getAiActionCreditCost('updateResumeForJob')).toBe(1);
    expect(getAiActionCreditCost('transformResumeForRole')).toBe(1);
    expect(getAiActionCreditCost('extractResumeFromFile')).toBe(1);
    expect(getAiActionCreditCost('parseDocxToFieldMap')).toBe(1);

    expect(getAiActionCreditCost('analyzeMatch')).toBe(0);
    expect(getAiActionCreditCost('generateSuggestions')).toBe(0);
    expect(getAiActionCreditCost('generateRefactoredHighlights')).toBe(0);
    expect(getAiActionCreditCost('editField')).toBe(0);
    expect(getAiActionCreditCost('generateRecruiterEmail')).toBe(0);
    expect(getAiActionCreditCost('draftFollowUpEmail')).toBe(0);
    expect(getAiActionCreditCost('classifyReplySentiment')).toBe(0);
    expect(getAiActionCreditCost('unknown')).toBeNull();
  });

  it('prices outreach flows by generated resume, not email drafting', () => {
    expect(RESUME_GENERATION_CREDIT_COST).toBe(1);
    expect(getOutreachFlowCreditCost({ mode: 'existing' })).toBe(0);
    expect(getOutreachFlowCreditCost({ mode: 'tailored' })).toBe(1);
    expect(getOutreachFlowCreditCost({ mode: 'tailored', resultResumeId: 'resume_123' })).toBe(0);
  });

  it('guards signup credits and repeated Stripe webhook completions', () => {
    expect(shouldGrantSignupCredits(null)).toBe(true);
    expect(shouldGrantSignupCredits({ email: 'new@example.com' })).toBe(true);
    expect(shouldGrantSignupCredits({ credits: 0 })).toBe(false);
    expect(shouldGrantSignupCredits({ signupCreditGrantedAt: {} })).toBe(false);

    expect(shouldApplyCheckoutCompletion(null)).toBe(true);
    expect(shouldApplyCheckoutCompletion({ status: 'pending' })).toBe(true);
    expect(shouldApplyCheckoutCompletion({ status: 'completed' })).toBe(false);
  });
});
