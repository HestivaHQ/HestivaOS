import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../lib/account-policy';
import { createClient } from '../../../../lib/supabase/server';
import { AppFrame } from '../../../components/app-frame';
import { BusinessProfileManager } from './business-profile-manager';

export default async function BusinessProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.syncUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  const profile = await authenticatedApi.businessProfile();
  return <AppFrame active="/admin/settings" email={user.email} user={appUser}><BusinessProfileManager initialProfile={profile} /></AppFrame>;
}
