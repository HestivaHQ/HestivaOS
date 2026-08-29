import { createAuthenticatedApi } from '../../../lib/api-server';
import { CustomersManager } from '../../customers/customers-manager';

export default async function CustomersPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const [appUser, customers] = await Promise.all([
    authenticatedApi.currentUser(),
    authenticatedApi.customers('?page=1&pageSize=100'),
  ]);

  return <><CustomersManager ownerId={appUser.id} initialItems={customers.items} /></>;
}
