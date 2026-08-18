import { api } from './api';
import { attentionOverview, type AttentionView } from './attention-api';
import { createClient } from './supabase/server';
import { redirect } from 'next/navigation';

export async function createAuthenticatedApi() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session is required.');
  return {
    syncUser: async () => {
      try { return await api.syncUser(session.access_token); }
      catch (error) {
        if (error instanceof Error && error.message === 'Hestiva OS access is disabled.') {
          await supabase.auth.signOut();
          redirect('/login?reason=access-disabled');
        }
        throw error;
      }
    },
    updateProfile: (input: Parameters<typeof api.updateProfile>[1]) => api.updateProfile(session.access_token, input),
    businessProfile: () => api.businessProfile(session.access_token),
    businessLists: (includeInactive = false) => api.businessLists(session.access_token, includeInactive),
    adminUsers: (search = '') => api.adminUsers(session.access_token, search),
    dashboard: () => api.dashboard(session.access_token),
    attention: (view: AttentionView = 'mine') => attentionOverview(session.access_token, view),
  };
}
