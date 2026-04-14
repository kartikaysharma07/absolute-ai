'use client';

import React, { useState } from 'react';
import { signIn } from '../application/signIn';
import { supabaseAuth } from '../infrastructure/supabaseAuth';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      // TODO: handle success (redirect, toast, etc.)
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await supabaseAuth.signInWithGoogle();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Google sign-in error', err);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading}>
          Sign in
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={handleGoogle}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}