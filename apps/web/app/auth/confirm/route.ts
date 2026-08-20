import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

function getSafeNextPath(value: string | null, fallback = '/') {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const fallbackPath = type === 'email_change' ? '/profile?email-change=confirmed' : '/';
  const nextPath = getSafeNextPath(searchParams.get('next'), fallbackPath);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      return NextResponse.redirect(`${origin}${nextPath}`);
    }
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'Unable to confirm your email. Please try signing in again.');
  return NextResponse.redirect(loginUrl);
}
