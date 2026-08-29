import { createAuthenticatedApi } from '../../../lib/api-server';
import { CustomersManager } from '../../customers/customers-manager';

export default async function CustomersPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();

  return <><CustomersManager ownerId={appUser.id} /></>;
}
