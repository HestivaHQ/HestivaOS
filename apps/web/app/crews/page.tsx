import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { CrewsManager } from './crews-manager';

export default async function CrewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  return <AppFrame active="/crews" email={user.email}><CrewsManager /></AppFrame>;
}
