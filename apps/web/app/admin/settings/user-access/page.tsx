import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../lib/account-policy';
import { AppFrame } from '../../../components/app-frame';
import { UserAccessManager } from './user-access-manager';

export default async function UserAccessPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.syncUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  const users = await authenticatedApi.adminUsers();
  return <AppFrame active="/admin/settings" email={appUser.email} user={appUser}>
    <div className="v2Workspace"><UserAccessManager initialUsers={users} currentUserId={appUser.id} /></div>
  </AppFrame>;
}
