'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

function getSafeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const nextPath = getSafeNextPath(searchParams.get('next'));

    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
            },
          });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === 'sign-up' && !result.data.session) {
      setMessage('Account created. Check your email to confirm your address.');
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="shell">
      <section className="card" style={{ maxWidth: 480 }}>
        <p className="eyebrow">Maintenance Marshall</p>
        <h1 style={{ fontSize: 'clamp(32px, 7vw, 44px)' }}>
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="summary">
          {mode === 'sign-in'
            ? 'Sign in to manage customers, properties, and work orders.'
            : 'Create an account to start using Maintenance Marshall.'}
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
            {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
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
