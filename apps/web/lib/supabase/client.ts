import { createBrowserClient } from '@supabase/ssr';

function getSupabaseProjectUrl(value: string) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.');
  }
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  return createBrowserClient(getSupabaseProjectUrl(supabaseUrl), supabaseAnonKey.trim());
}
