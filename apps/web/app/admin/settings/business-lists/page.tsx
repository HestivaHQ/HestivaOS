import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { AppFrame } from '../../../components/app-frame';
import { BusinessListsManager } from './business-lists-manager';

export default async function BusinessListsPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.syncUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const options = await authenticatedApi.businessLists(true);
  return <AppFrame active="/admin/settings" email={appUser.email} user={appUser}><div className="v2Workspace"><BusinessListsManager initialOptions={options} /></div></AppFrame>;
}
