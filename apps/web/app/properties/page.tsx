import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { PropertiesManager } from './properties-manager';

export default async function PropertiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');
  return <AppFrame active="/properties" email={user.email}><PropertiesManager /></AppFrame>;
}
