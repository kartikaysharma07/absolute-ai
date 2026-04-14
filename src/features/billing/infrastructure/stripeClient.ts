/**
 * Stripe client placeholders. Replace with official Stripe SDK on server.
 */
export const stripeClient = {
  async createCheckoutSession(priceId: string) {
    // TODO: create a real checkout session server-side
    return { url: '/mock-checkout' };
  },
  async handleWebhook(body: any, signature: string) {
    // TODO: verify signature and process events
    return { status: 'ok' };
  },
};