import { createAuthenticatedApi } from '../../lib/api-server';
import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { CustomersManager } from './customers-manager';

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  const name = user.user_metadata?.full_name as string | undefined;
  const [firstName = '', ...rest] = name?.split(' ') ?? [];
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session is required.');
  const appUser = await (await createAuthenticatedApi()).syncUser();

  return <AppFrame active="/customers" email={user.email}><CustomersManager ownerId={appUser.id} /></AppFrame>;
}
