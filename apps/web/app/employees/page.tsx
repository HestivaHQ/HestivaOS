import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../lib/api-server';
import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { EmployeesManager } from './employees-manager';
export default async function EmployeesPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user?.email) redirect('/login');
  const authenticatedApi = await createAuthenticatedApi(); const appUser = await authenticatedApi.syncUser(); if (appUser.role !== 'ADMIN') redirect('/');
  return <AppFrame active="/employees" email={user.email} user={appUser}><EmployeesManager /></AppFrame>;
}
