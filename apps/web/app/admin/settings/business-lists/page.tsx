import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { api } from '../../../../lib/api';
import { createClient } from '../../../../lib/supabase/server';
import { AppFrame } from '../../../components/app-frame';
import { BusinessListsManager } from './business-lists-manager';

export default async function BusinessListsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user?.email || !session) redirect('/login');
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const options = await api.businessLists(session.access_token, true);
  return <AppFrame active="/admin/settings" email={user.email} user={appUser}><BusinessListsManager initialOptions={options} /></AppFrame>;
}
