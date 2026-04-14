export const stripePlans = [
  {
    id: 'basic',
    title: 'Basic',
    description: 'Entry-level plan for light usage and experimentation.',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID ?? '',
    amountLabel: '$10 / month',
    feature: 'Basic plan',
  },
  {
    id: 'pro',
    title: 'Pro',
    description: 'For teams and heavier usage with higher limits.',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    amountLabel: '$49 / month',
    feature: 'Pro plan',
  },
] as const;

export function getStripePlanById(planId: string) {
  return stripePlans.find((plan) => plan.id === planId);
}

export function getPlanIdByPriceId(priceId?: string | null) {
  if (!priceId) return null;
  const plan = stripePlans.find((p) => p.priceId === priceId);
  return plan?.id ?? null;
}
