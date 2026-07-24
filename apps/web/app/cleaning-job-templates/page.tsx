import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { CleaningJobTemplatesManager } from './cleaning-job-templates-manager';

export default async function CleaningJobTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Authenticated user is required.');
  return <AppFrame active="/cleaning-job-templates" email={user.email}><CleaningJobTemplatesManager /></AppFrame>;
}