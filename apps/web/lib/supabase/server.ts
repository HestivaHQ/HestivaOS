import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseProjectUrl(value: string) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.');
  }
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  return createServerClient(getSupabaseProjectUrl(supabaseUrl), supabaseAnonKey.trim(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Middleware refreshes
          // authentication cookies before protected pages are rendered.
        }
      },
    },
  });
}
