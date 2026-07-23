import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { TechniciansManager } from './technicians-manager';

export default async function TechniciansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  return <AppFrame active="/technicians" email={user.email}><TechniciansManager /></AppFrame>;
}
