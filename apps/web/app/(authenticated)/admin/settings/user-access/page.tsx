import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../../lib/account-policy';
import { UserAccessManager } from '../../../../admin/settings/user-access/user-access-manager';

export default async function UserAccessPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.currentUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  const users = await authenticatedApi.adminUsers();
  return <>
    <div className="v2Workspace"><UserAccessManager initialUsers={users} currentUserId={appUser.id} /></div>
  </>;
}
