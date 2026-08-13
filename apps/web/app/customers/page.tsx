import { createAuthenticatedApi } from '../../lib/api-server';
import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { CustomersManager } from './customers-manager';

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  const appUser = await (await createAuthenticatedApi()).syncUser();

  return <AppFrame active="/customers" email={user.email} user={appUser}><CustomersManager ownerId={appUser.id} /></AppFrame>;
}
