import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../lib/account-policy';
import { AppFrame } from '../../../components/app-frame';
import { AdminServicesManager } from './services-manager';

export default async function AdminServicesPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  return <AppFrame active="/admin/settings" email={appUser.email} user={appUser}><AdminServicesManager /></AppFrame>;
}
