import { api } from './api';
import { attentionOverview, type AttentionView } from './attention-api';
import { createClient } from './supabase/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export const createAuthenticatedApi = cache(async function createAuthenticatedApi() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session is required.');
  const currentUser = api.currentUser(session.access_token).catch(async (error) => {
    if (error instanceof Error && error.message === 'Hestiva OS access is disabled.') {
      await supabase.auth.signOut();
      redirect('/login?reason=access-disabled');
    }
    throw error;
  });
  return {
    currentUser: () => currentUser,
    updateProfile: (input: Parameters<typeof api.updateProfile>[1]) => api.updateProfile(session.access_token, input),
    businessProfile: () => api.businessProfile(session.access_token),
    businessLists: (includeInactive = false) => api.businessLists(session.access_token, includeInactive),
    adminUsers: (search = '') => api.adminUsers(session.access_token, search),
    dashboard: () => api.dashboard(session.access_token),
    customers: (query = '') => api.customers(query),
    customerSelectorOptions: (search = '') => api.customerSelectorOptions(search),
    properties: (query = '') => api.properties(query),
    activeBusinessLists: (type: Parameters<typeof api.activeBusinessLists>[0]) => api.activeBusinessLists(type),
    workOrders: (query = '') => api.workOrders(query),
    attention: (view: AttentionView = 'mine') => attentionOverview(session.access_token, view),
    supervisorOperations: () => api.supervisorOperations(session.access_token),
  };
});
