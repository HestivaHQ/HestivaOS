import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { RecurringServicesManager } from './recurring-services-manager';
export default async function RecurringServicesPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');
  return <AppFrame active="/recurring-services" email={user.email}><RecurringServicesManager /></AppFrame>;
}
