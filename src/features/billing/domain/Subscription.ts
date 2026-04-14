export type Subscription = {
  id: string;
  userId: string;
  status: 'active' | 'canceled' | 'trialing' | 'past_due';
  priceId?: string;
  currentPeriodEnd?: number;
};