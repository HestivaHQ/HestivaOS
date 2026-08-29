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
    employees: (query = '') => api.employees(session.access_token, query),
    dashboard: () => api.dashboard(session.access_token),
    customers: (query = '') => api.customers(query, session.access_token),
    customerSelectorOptions: (search = '') => api.customerSelectorOptions(search, session.access_token),
    properties: (query = '') => api.properties(query, session.access_token),
    activeBusinessLists: (type: Parameters<typeof api.activeBusinessLists>[0]) => api.activeBusinessLists(type, session.access_token),
    technicians: (query = '') => api.technicians(query, session.access_token),
    crews: (query = '') => api.crews(query, session.access_token),
    services: (query = '') => api.services(query, session.access_token),
    workOrders: (query = '') => api.workOrders(query, session.access_token),
    quotes: (query = '') => api.quotes(query, session.access_token),
    recurringServices: () => api.recurringServices(session.access_token),
    shifts: (query = '') => api.shifts(query, session.access_token),
    attention: (view: AttentionView = 'mine') => attentionOverview(session.access_token, view),
    supervisorOperations: () => api.supervisorOperations(session.access_token),
  };
});
