import { createClient } from '../../../lib/supabase/server';
import { AppFrame } from '../../components/app-frame';
import { TechnicianJobView } from './technician-job-view';

export default async function TechnicianJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');

  return <AppFrame active="/work-orders" email={user.email}><TechnicianJobView workOrderId={id} /></AppFrame>;
}
