'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

function getSafeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submissionInFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const nextPath = getSafeNextPath(params.get('next'));
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}` } });
      if (result.error) {
        setMessage(mode === 'sign-in' ? 'Unable to sign in. Check your email and password, then try again.' : 'Unable to create the account. Check your details and try again.');
        return;
      }
      if (mode === 'sign-up' && !result.data.session) {
        setMessage('Account created. Check your email to confirm your address.');
        return;
      }
      router.replace(nextPath);
    } catch {
      setMessage('Authentication is temporarily unavailable. Please try again.');
    } finally {
      submissionInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="card" style={{ maxWidth: 480 }}>
        <p className="eyebrow">Hestiva OS</p>
        <h1 style={{ fontSize: 'clamp(32px, 7vw, 44px)' }}>
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="summary">
          {mode === 'sign-in'
            ? 'Sign in to manage customers, properties, and work orders.'
            : 'Create an account to start using Hestiva OS.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18, marginTop: 28 }}>
          <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              style={{ padding: '13px 14px', border: '1px solid #bfc9ca', borderRadius: 10, font: 'inherit' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              style={{ padding: '13px 14px', border: '1px solid #bfc9ca', borderRadius: 10, font: 'inherit' }}
            />
          </label>

          {message ? (
            <p role="status" style={{ margin: 0, padding: 12, borderRadius: 10, background: '#f8f9f9' }}>
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 18px',
              border: 0,
              borderRadius: 10,
              background: '#17202a',
              color: 'white',
              font: 'inherit',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (mode === 'sign-in' ? 'Signing in…' : 'Creating account…') : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setMessage(null);
          }}
          style={{ marginTop: 18, padding: 0, border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer' }}
        >
          {mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
