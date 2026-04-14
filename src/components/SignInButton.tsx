'use client';

import React, { useEffect } from 'react';
import { supabaseBrowserClient } from '../lib/supabase/browser';

export default function SignInButton() {
  const handleSignIn = async () => {
    if (!supabaseBrowserClient) {
      // eslint-disable-next-line no-console
      console.error('Supabase browser client not configured');
      return;
    }

    await supabaseBrowserClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/signin`,
      },
    });
  };

  useEffect(() => {
    if (!supabaseBrowserClient) return;

    const { data: sub } = supabaseBrowserClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        try {
          await fetch('/api/auth/upsert', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Profile upsert failed', err);
        }
      }
    });

    return () => sub?.unsubscribe();
  }, []);

  return (
    <button onClick={handleSignIn} className="rounded-md bg-teal-600 px-4 py-2 text-white">
      Sign in with Google
    </button>
  );
}
