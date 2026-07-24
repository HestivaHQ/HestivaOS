import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { ServicesManager } from './services-manager';

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  return <AppFrame active="/services" email={user.email}><ServicesManager /></AppFrame>;
}
