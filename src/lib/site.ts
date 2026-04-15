export const siteConfig = {
  name: 'Autolead AI',
  shortName: 'Autolead AI',
  description:
    'Autolead AI builds GenAI, agentic systems, data engineering, and automation solutions that help businesses grow faster.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://autoleadai.com',
  email: 'hello@autoleadai.com',
  twitter: '@AbsoluteAI',
  stripe: {
    strategyPriceId: process.env.NEXT_PUBLIC_STRIPE_STRATEGY_PRICE_ID ?? '',
    sprintPriceId: process.env.NEXT_PUBLIC_STRIPE_SPRINT_PRICE_ID ?? '',
    enterprisePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? '',
  },
  keywords: [
    'Autolead AI',
    'AI consulting',
    'generative AI',
    'agentic systems',
    'AI automation',
    'data engineering',
    'business AI solutions',
  ],
};

export function getSiteUrl(pathname = '/') {
  return new URL(pathname, siteConfig.url).toString();
}
