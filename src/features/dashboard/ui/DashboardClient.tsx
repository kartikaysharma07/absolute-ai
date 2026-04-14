'use client';

import React, { useEffect, useState } from 'react';
import { supabaseBrowserClient } from '../../../lib/supabase/browser';
import StripeCheckoutButton from '../../../components/StripeCheckoutButton';
import StripePortalButton from '../../../components/StripePortalButton';

type Summary = {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
};

type Profile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  plan?: string | null;
};

export default function DashboardClient() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<{ plan?: string | null; status?: string | null } | null>(null);
  const [apiKeys, setApiKeys] = useState<Array<any>>([]);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (!supabaseBrowserClient) {
          setError('Supabase not configured.');
          setLoading(false);
          return;
        }

        const { data } = await supabaseBrowserClient.auth.getSession();
        const accessToken = data.session?.access_token;
        const user = data.session?.user;
        if (!accessToken || !user) {
          setError('Not signed in');
          setLoading(false);
          return;
        }

        // fetch profile
        const { data: profileData } = await supabaseBrowserClient.from('profiles').select('id,email,full_name,avatar_url,plan').eq('id', user.id).maybeSingle();
        if (mounted) setProfile(profileData ?? null);

        // fetch simple subscription
        const { data: subData } = await supabaseBrowserClient.from('subscriptions_simple').select('plan,status,created_at').eq('user_id', user.id).maybeSingle();
        if (mounted) setSubscription(subData ?? null);

        // fetch api keys
        try {
          const keysRes = await fetch('/api/dashboard/api-keys', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
          if (keysRes.ok) {
            const keysJson = await keysRes.json();
            if (mounted) setApiKeys(keysJson.keys ?? []);
          }
        } catch (e) {
          // ignore api keys loading error
        }

        // fetch usage summary
        const res = await fetch('/api/dashboard/summary', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json?.message ?? 'Failed to load summary');
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (mounted) setSummary(json.summary ?? null);
      } catch (e: any) {
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!summary || !profile) return <div className="p-6">No data</div>;

  const percent = Math.min(100, Math.round(((summary.limit - summary.remaining) / Math.max(1, summary.limit)) * 100));

  const currentPlan = subscription?.plan ?? profile?.plan ?? summary.plan ?? 'free';
  const subscriptionStatus = subscription?.status ?? 'inactive';

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-1">
          <div className="rounded-2xl border bg-white p-6 shadow">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold">
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : (profile.email ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-lg font-semibold">{profile.full_name ?? profile.email}</div>
                <div className="text-sm text-slate-500">{profile.email}</div>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="text-sm text-slate-500">Subscription</div>
              <div className="mt-1 flex items-center justify-between">
                <div>
                  <div className="font-medium">{currentPlan?.toUpperCase()}</div>
                  <div className="text-xs text-slate-500">Status: {subscriptionStatus}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StripePortalButton className="rounded-md border bg-white px-3 py-2 text-sm font-medium" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="rounded-2xl border bg-white p-6 shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Usage</h2>
                <p className="mt-1 text-sm text-slate-500">Monthly token allocation and usage</p>
              </div>
              <div className="flex gap-2">
                {currentPlan !== 'pro' && (
                  <StripeCheckoutButton planId="pro" className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white">
                    Upgrade to Pro
                  </StripeCheckoutButton>
                )}
                {currentPlan === 'free' && (
                  <StripeCheckoutButton planId="basic" className="rounded-md border px-3 py-2 text-sm font-semibold">
                    Upgrade to Basic
                  </StripeCheckoutButton>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Allocated</div>
                <div className="mt-1 text-lg font-semibold">{summary.limit.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Used (month)</div>
                <div className="mt-1 text-lg font-semibold">{summary.used.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Remaining</div>
                <div className="mt-1 text-lg font-semibold">{summary.remaining.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-3 w-full rounded-full bg-slate-200">
                <div style={{ width: `${percent}%` }} className="h-3 rounded-full bg-teal-600" />
              </div>
              <div className="mt-2 text-sm text-slate-500">{Math.round(percent)}% of monthly allocation used</div>
            </div>
            
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold">API Keys</h3>
              <p className="mt-1 text-sm text-slate-500">Create and manage API keys for external access. Copy the key now — it will not be shown again.</p>

              {newKeyRaw && (
                <div className="mt-4 rounded-md border bg-slate-50 p-4">
                  <div className="text-sm text-slate-600">New API Key (copy this now)</div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="truncate rounded bg-white px-3 py-2 font-mono text-sm">{newKeyRaw}</code>
                    <button
                      className="rounded bg-teal-600 px-3 py-2 text-sm font-medium text-white"
                      onClick={() => {
                        void navigator.clipboard.writeText(newKeyRaw).then(() => {});
                      }}
                    >
                      Copy
                    </button>
                    <button
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => {
                        setNewKeyRaw(null);
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  placeholder="Key name (optional)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <button
                  className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const { data } = await supabaseBrowserClient.auth.getSession();
                      const accessToken = data.session?.access_token;
                      if (!accessToken) throw new Error('Not signed in');

                      const res = await fetch('/api/dashboard/api-keys', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                        body: JSON.stringify({ name: newKeyName }),
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json?.message ?? 'Failed to create key');
                      setNewKeyRaw(json.rawKey ?? null);
                      setNewKeyName('');
                      // refresh list
                      const keysRes = await fetch('/api/dashboard/api-keys', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
                      if (keysRes.ok) {
                        const keysJson = await keysRes.json();
                        setApiKeys(keysJson.keys ?? []);
                      }
                    } catch (e: any) {
                      // eslint-disable-next-line no-console
                      console.error('Create key failed', e);
                      setError(String(e));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Create key
                </button>
              </div>

              <div className="mt-4">
                <ul className="space-y-2">
                  {apiKeys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between rounded-md border bg-white p-3">
                      <div>
                        <div className="font-medium">{k.name ?? `key-${k.id.slice(0, 8)}`}</div>
                        <div className="text-xs text-slate-500">Created: {new Date(k.created_at).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-slate-500">{k.revoked ? 'Revoked' : 'Active'}</div>
                        {!k.revoked && (
                          <button
                            className="rounded border px-3 py-2 text-sm"
                            onClick={async () => {
                              try {
                                setLoading(true);
                                const { data } = await supabaseBrowserClient.auth.getSession();
                                const accessToken = data.session?.access_token;
                                if (!accessToken) throw new Error('Not signed in');

                                const res = await fetch('/api/dashboard/api-keys', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                                  body: JSON.stringify({ id: k.id }),
                                });
                                if (!res.ok) throw new Error('Failed to revoke');
                                const keysRes = await fetch('/api/dashboard/api-keys', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
                                if (keysRes.ok) {
                                  const keysJson = await keysRes.json();
                                  setApiKeys(keysJson.keys ?? []);
                                }
                              } catch (e: any) {
                                // eslint-disable-next-line no-console
                                console.error('Revoke failed', e);
                                setError(String(e));
                              } finally {
                                setLoading(false);
                              }
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
