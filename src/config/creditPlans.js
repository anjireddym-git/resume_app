export const CREDIT_PLANS = Object.freeze({
  free: Object.freeze({
    id: 'free',
    name: 'Free',
    credits: 10,
    price: 0,
    checkoutEnabled: false,
    description: 'Included automatically for new accounts.',
  }),
  starter: Object.freeze({
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: 19,
    checkoutEnabled: true,
    description: 'Good for a focused job search sprint.',
  }),
  pro: Object.freeze({
    id: 'pro',
    name: 'Pro',
    credits: 400,
    price: 49,
    checkoutEnabled: true,
    description: 'For steady resume tailoring across many roles.',
  }),
  career_accelerator: Object.freeze({
    id: 'career_accelerator',
    name: 'Career Accelerator',
    credits: 1000,
    price: 99,
    checkoutEnabled: true,
    description: 'Best for high-volume applications and outreach.',
  }),
});

export const CREDIT_PLAN_ORDER = Object.freeze([
  'free',
  'starter',
  'pro',
  'career_accelerator',
]);

export const PURCHASABLE_CREDIT_PLANS = Object.freeze(
  CREDIT_PLAN_ORDER
    .map((planId) => CREDIT_PLANS[planId])
    .filter((plan) => plan.checkoutEnabled)
);

export const getCreditPlan = (planId) => CREDIT_PLANS[String(planId || '').trim()] || null;
