'use client';

import React from 'react';
import { stripeClient } from '../infrastructure/stripeClient';

export default function BillingPage() {
  async function startCheckout() {
    const res = await stripeClient.createCheckoutSession('price_xxx');
    if (res?.url) {
      window.location.href = res.url;
    }
  }

  return (
    <div>
      <h1>Billing</h1>
      <button onClick={() => startCheckout()}>Subscribe</button>
    </div>
  );
}