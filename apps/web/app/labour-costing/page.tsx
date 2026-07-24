import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { LabourCostingManager } from './labour-costing-manager';

export default async function LabourCostingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');
  return <AppFrame active="/labour-costing" email={user.email}><LabourCostingManager /></AppFrame>;
}