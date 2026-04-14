import { supabaseAdmin } from '../supabase/server';
import { stripe } from '../stripe/server';

export const FREE_TIER_TOKENS = Number(process.env.FREE_TIER_TOKENS ?? 10000);
export const PAID_TIER_TOKENS = Number(process.env.PAID_TIER_TOKENS ?? 1000000);
export const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_DEFAULT_MAX_OUTPUT_TOKENS ?? 1024);

export function estimateTokens(text?: string) {
  if (!text) return 0;
  // Rough heuristic: ~4 characters per token for English-like text
  return Math.max(1, Math.ceil(text.length / 4));
}

async function getUserPlan(userId: string | null) {
  if (!userId) return 'free';
  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions_simple')
      .select('plan,status')
      .eq('user_id', userId)
      .limit(1);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('getUserPlan error', error);
      return 'free';
    }
    return data?.[0]?.plan ?? 'free';
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('getUserPlan exception', e);
    return 'free';
  }
}

function getPlanLimit(plan?: string) {
  const p = (plan ?? '').toLowerCase();
  if (!p || p.includes('free')) return FREE_TIER_TOKENS;
  return PAID_TIER_TOKENS;
}

async function getTokensUsedThisMonth(userId: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = now.toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from('usage')
      .select('tokens_used')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lte('created_at', end);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('getTokensUsedThisMonth error', error);
      return 0;
    }
    const total = (data ?? []).reduce((acc: number, row: any) => acc + (Number(row.tokens_used) || 0), 0);
    return total;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('getTokensUsedThisMonth exception', e);
    return 0;
  }
}

type CheckResult =
  | { allowed: false; reason: 'unauthenticated' | 'quota_exceeded' | 'db_error'; limit?: number; remaining?: number }
  | { allowed: true; reservationId: string; limit: number; remaining: number };

export async function checkAndReserve(
  userId: string | null,
  prompt: string,
  expectedMaxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  apiKeyId?: string,
): Promise<CheckResult> {
  if (!userId) return { allowed: false, reason: 'unauthenticated' };

  const promptTokens = estimateTokens(prompt);
  const tokensToReserve = promptTokens + expectedMaxOutputTokens;

  const plan = await getUserPlan(userId);
  const limit = getPlanLimit(plan);
  const used = await getTokensUsedThisMonth(userId);

  const extra = Math.max(0, used + tokensToReserve - limit);

  try {
    const insertObj: any = { user_id: userId, tokens_used: tokensToReserve };
    if (apiKeyId) insertObj.api_key_id = apiKeyId;

    const { data, error } = await supabaseAdmin
      .from('usage')
      .insert([insertObj])
      .select()
      .single();

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error('reserve tokens error', error);
      return { allowed: false, reason: 'db_error' };
    }

    const reservationId = data.id as string;

    // If this reservation causes overage, attempt to charge for extra tokens (best-effort).
    if (extra > 0) {
      try {
        await chargeExtraTokens(userId, extra, reservationId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to charge extra tokens:', err);
        // We do not block usage if charging fails; the usage row remains and will be visible in dashboard/payments.
      }
    }

    return { allowed: true, reservationId, limit, remaining: Math.max(0, limit - (used + tokensToReserve)) };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('reserve tokens exception', e);
    return { allowed: false, reason: 'db_error' };
  }
}

export async function finalizeReservation(reservationId: string, actualTokens: number) {
  try {
    const { error } = await supabaseAdmin.from('usage').update({ tokens_used: actualTokens }).eq('id', reservationId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('finalizeReservation error', error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('finalizeReservation exception', e);
  }
}

export async function cancelReservation(reservationId: string) {
  try {
    const { error } = await supabaseAdmin.from('usage').delete().eq('id', reservationId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('cancelReservation error', error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('cancelReservation exception', e);
  }
}

export async function recordUsage(userId: string | null, tokens: number) {
  if (!userId) return;
  try {
    const { error } = await supabaseAdmin.from('usage').insert([{ user_id: userId, tokens_used: tokens }]);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('recordUsage error', error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('recordUsage exception', e);
  }
}

const TOKEN_PRICE_CENTS = Number(process.env.TOKEN_PRICE_CENTS ?? 1);
const TOKEN_CURRENCY = process.env.TOKEN_CURRENCY ?? 'usd';

async function chargeExtraTokens(userId: string | null, extraTokens: number, reservationId?: string) {
  if (!userId) throw new Error('Missing userId');

  // fetch stripe customer id and email
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    // eslint-disable-next-line no-console
    console.error('chargeExtraTokens profile lookup failed', profileError);
  }

  const customerId = profile?.stripe_customer_id ?? null;
  const amount = Math.max(0, Math.floor(extraTokens * TOKEN_PRICE_CENTS));

  if (stripe && customerId) {
    try {
      await stripe.invoiceItems.create({
        customer: customerId,
        currency: TOKEN_CURRENCY,
        amount,
        description: `Extra AI tokens (${extraTokens})`,
        metadata: { reservation_id: reservationId ?? '' },
      });

      const invoice = await stripe.invoices.create({
        customer: customerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata: { reservation_id: reservationId ?? '' },
      });

      // Try to finalize (and pay if payment method is available). Not fatal if pay fails.
      let finalized: any = invoice;
      try {
        finalized = await stripe.invoices.finalizeInvoice(invoice.id);
        try {
          await stripe.invoices.pay(finalized.id);
        } catch (payErr) {
          // payment may be pending; that's OK
        }
      } catch (finalizeErr) {
        // ignore finalize errors
      }

      // record in payments table
      try {
        await supabaseAdmin.from('payments').insert({
          stripe_invoice_id: finalized?.id ?? null,
          stripe_customer_id: customerId,
          supabase_user_id: userId,
          email: profile?.email ?? null,
          amount_total: amount,
          currency: TOKEN_CURRENCY,
          payment_status: finalized?.status ?? 'pending',
          plan_id: 'extra_tokens',
          plan_title: `Extra tokens (${extraTokens})`,
          raw_event: finalized ?? null,
        });
      } catch (pErr) {
        // eslint-disable-next-line no-console
        console.error('Failed to record payment for extra tokens', pErr);
      }

      return { success: true, invoiceId: finalized?.id ?? null, amount };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Stripe error charging extra tokens', err);
      // fallback: persist pending payment
      try {
        await supabaseAdmin.from('payments').insert({
          stripe_customer_id: customerId,
          supabase_user_id: userId,
          email: profile?.email ?? null,
          amount_total: amount,
          currency: TOKEN_CURRENCY,
          payment_status: 'pending',
          plan_id: 'extra_tokens',
          plan_title: `Extra tokens (${extraTokens})`,
          raw_event: { error: String(err) },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist pending payment', e);
      }

      return { success: false, reason: 'stripe_error', amount };
    }
  }

  // No stripe or no customer — persist a pending payment record so admin can invoice later.
  try {
    await supabaseAdmin.from('payments').insert({
      stripe_customer_id: null,
      supabase_user_id: userId,
      email: profile?.email ?? null,
      amount_total: amount,
      currency: TOKEN_CURRENCY,
      payment_status: 'pending',
      plan_id: 'extra_tokens',
      plan_title: `Extra tokens (${extraTokens})`,
      raw_event: { note: 'no_stripe_or_customer' },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist pending payment (no stripe)', e);
  }

  return { success: false, reason: 'no_stripe', amount };
}

export async function getUsageSummary(userId: string | null) {
  if (!userId) return { plan: 'free', limit: FREE_TIER_TOKENS, used: 0, remaining: FREE_TIER_TOKENS };
  const plan = await getUserPlan(userId);
  const limit = getPlanLimit(plan);
  const used = await getTokensUsedThisMonth(userId);
  const remaining = Math.max(0, limit - used);
  return { plan, limit, used, remaining };
}
