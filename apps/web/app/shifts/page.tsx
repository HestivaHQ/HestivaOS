import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { ShiftsManager } from './shifts-manager';

export default async function ShiftsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  return <AppFrame active="/shifts" email={user.email}><ShiftsManager /></AppFrame>;
}
