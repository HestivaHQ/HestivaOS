import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../lib/account-policy';
import { createClient } from '../../../../lib/supabase/server';
import { AppFrame } from '../../../components/app-frame';
import { AdminServicesManager } from './services-manager';

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  return <AppFrame active="/admin/settings" email={user.email} user={appUser}><AdminServicesManager /></AppFrame>;
}
