'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { api } from '../../lib/api';

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
  const [hydrated, setHydrated] = useState(false);
  const submissionInFlight = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || submissionInFlight.current) return;
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
      if (result.data.session) {
        // Login is the deliberate identity bootstrap/reconciliation boundary.
        // Protected route transitions use the read-only /users/me endpoint.
        await api.syncUser(result.data.session.access_token);
      }
      router.replace(nextPath);
    } catch {
      setMessage('Authentication is temporarily unavailable. Please try again.');
    } finally {
      submissionInFlight.current = false;
      setLoading(false);
    }
  }

  const signIn = mode === 'sign-in';
  const interactive = hydrated && !loading;

  return (
    <main className="loginShell">
      <section className="loginBrandPanel" aria-label="Homent operations">
        <div className="loginBrandMark">
          <strong>Homent</strong>
          <span>Operations</span>
        </div>
        <div className="loginBrandCopy">
          <p>Hestiva OS</p>
          <h1>Care, coordinated beautifully.</h1>
          <p>One secure place for the people, homes, quotes and work behind every Homent service.</p>
        </div>
      </section>

      <section className="loginFormPanel">
        <div className="loginCard">
          <p className="eyebrow">Homent operations</p>
          <h2>{signIn ? 'Welcome back' : 'Create your account'}</h2>
          <p className="summary">
            {signIn
              ? 'Sign in to continue to Hestiva OS.'
              : 'Create your Hestiva OS account using your work email.'}
          </p>

          <form className="loginForm" onSubmit={handleSubmit} aria-busy={!hydrated || loading}>
            <label className="formField">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                disabled={!interactive}
                required
              />
            </label>

            <label className="formField">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={signIn ? 'current-password' : 'new-password'}
                minLength={6}
                disabled={!interactive}
                required
              />
            </label>

            {message ? <p className="formMessage" role="status" aria-live="polite">{message}</p> : null}

            <button className="primaryButton" type="submit" disabled={!interactive}>
              {loading ? (signIn ? 'Signing in…' : 'Creating account…') : signIn ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            className="quietButton"
            type="button"
            disabled={!interactive}
            onClick={() => {
              setMode(signIn ? 'sign-up' : 'sign-in');
              setMessage(null);
            }}
          >
            {signIn ? 'Need an account? Create one' : 'Already have an account? Sign in'}
          </button>

          <p className="loginSecurityNote">Hestiva OS is for authorised Homent operations users.</p>
        </div>
      </section>
    </main>
  );
}
