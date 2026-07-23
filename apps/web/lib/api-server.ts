import { api } from './api';
import { createClient } from './supabase/server';

export async function createAuthenticatedApi() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session is required.');
  return {
    syncUser: () => api.syncUser(session.access_token),
    updateProfile: (input: Parameters<typeof api.updateProfile>[1]) => api.updateProfile(session.access_token, input),
  };
}
