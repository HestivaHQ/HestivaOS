import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getSupabaseProjectUrl(value: string) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith('/login');
  const isAuthCallbackRoute = pathname.startsWith('/auth/');
  const isPublicQuoteRoute = pathname === '/quote' || pathname.startsWith('/quote/');
  const isPublicRoute = isLoginRoute || isAuthCallbackRoute || isPublicQuoteRoute;

  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = rawSupabaseUrl ? getSupabaseProjectUrl(rawSupabaseUrl) : null;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicRoute) return response;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey.trim(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getClaims verifies asymmetric Supabase JWT signatures against the project's
  // public JWKS and validates expiry. Unlike getUser, a warm verification does
  // not make an Auth service request on every route transition.
  const { data, error } = await supabase.auth.getClaims();
  const authenticated = !error && typeof data?.claims?.sub === 'string';

  if (!authenticated && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isLoginRoute) {
    const nextPath = request.nextUrl.searchParams.get('next');
    const destination = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
