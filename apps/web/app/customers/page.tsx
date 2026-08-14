import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { CustomersManager } from './customers-manager';

export default async function CustomersPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();

  return <AppFrame active="/customers" email={appUser.email} user={appUser}><CustomersManager ownerId={appUser.id} /></AppFrame>;
}
