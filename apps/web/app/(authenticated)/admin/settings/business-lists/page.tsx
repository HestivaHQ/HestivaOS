import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { BusinessListsManager } from '../../../../admin/settings/business-lists/business-lists-manager';

export default async function BusinessListsPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.currentUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const options = await authenticatedApi.businessLists(true);
  return <><div className="v2Workspace"><BusinessListsManager initialOptions={options} /></div></>;
}
