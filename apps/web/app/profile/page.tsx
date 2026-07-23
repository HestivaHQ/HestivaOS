import { createAuthenticatedApi } from '../../lib/api-server';
import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { ProfileManager } from './profile-manager';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');
  const fullName = user.user_metadata?.full_name as string | undefined;
  const [firstName = '', ...rest] = fullName?.split(' ') ?? [];
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session is required.');
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/profile" email={user.email} user={appUser}><ProfileManager user={appUser} /></AppFrame>;
}
