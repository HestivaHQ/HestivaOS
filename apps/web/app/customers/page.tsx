import { api } from '../../lib/api';
import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { CustomersManager } from './customers-manager';

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  const name = user.user_metadata?.full_name as string | undefined;
  const [firstName = '', ...rest] = name?.split(' ') ?? [];
  const appUser = await api.syncUser({ authUserId: user.id, email: user.email, firstName, lastName: rest.join(' ') });

  return <AppFrame active="/customers" email={user.email}><CustomersManager ownerId={appUser.id} /></AppFrame>;
}
