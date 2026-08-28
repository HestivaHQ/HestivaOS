import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../../lib/account-policy';
import { AdminServicesManager } from '../../../../admin/settings/services/services-manager';

export default async function AdminServicesPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  return <><div className="v2Workspace"><AdminServicesManager /></div></>;
}
