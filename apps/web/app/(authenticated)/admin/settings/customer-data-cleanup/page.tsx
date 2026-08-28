import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { CustomerDataCleanup } from '../../../../admin/settings/customer-data-cleanup/customer-data-cleanup';

export default async function CustomerDataCleanupPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  return <><div className="v2Workspace"><CustomerDataCleanup /></div></>;
}
