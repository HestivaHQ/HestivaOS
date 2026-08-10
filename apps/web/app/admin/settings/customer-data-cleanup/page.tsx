import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { createClient } from '../../../../lib/supabase/server';
import { AppFrame } from '../../../components/app-frame';
import { CustomerDataCleanup } from './customer-data-cleanup';

export default async function CustomerDataCleanupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  return <AppFrame active="/admin/settings" email={user.email} user={appUser}><CustomerDataCleanup /></AppFrame>;
}
