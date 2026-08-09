import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../lib/account-policy';
import { createClient } from '../../../../lib/supabase/server';
import { AppFrame } from '../../../components/app-frame';
import { UserAccessManager } from './user-access-manager';

export default async function UserAccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.syncUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  const users = await authenticatedApi.adminUsers();
  return <AppFrame active="/admin/settings" email={user.email} user={appUser}>
    <UserAccessManager initialUsers={users} currentUserId={appUser.id} />
  </AppFrame>;
}
