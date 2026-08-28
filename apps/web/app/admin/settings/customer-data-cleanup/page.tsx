import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { AppFrame } from '../../../components/app-frame';
import { CustomerDataCleanup } from './customer-data-cleanup';

export default async function CustomerDataCleanupPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  return <AppFrame active="/admin/settings" email={appUser.email} user={appUser}><div className="v2Workspace"><CustomerDataCleanup /></div></AppFrame>;
}
