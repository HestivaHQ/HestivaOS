import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../../lib/account-policy';
import { AdminServicesManager } from '../../../../admin/settings/services/services-manager';

export default async function AdminServicesPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.currentUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  const initialItems = (await authenticatedApi.services('?page=1&pageSize=100&search=')).items;
  return <><div className="v2Workspace"><AdminServicesManager initialItems={initialItems} /></div></>;
}
