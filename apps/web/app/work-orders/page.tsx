import { createAuthenticatedApi } from '../../lib/api-server';
import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { WorkOrdersManager } from './work-orders-manager';

export default async function WorkOrdersPage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('Authenticated user is required.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Authenticated session is required.');
    const appUser = await (await createAuthenticatedApi()).syncUser();

    return <AppFrame active="/work-orders" email={user.email}><WorkOrdersManager createdById={appUser.id} /></AppFrame>;
  } catch (error) {
    const details = error instanceof Error
      ? { message: error.message, stack: error.stack, cause: (error as Error & { cause?: unknown }).cause, error }
      : { message: String(error), stack: undefined, cause: undefined, error };
    console.error('WORK_ORDERS_PAGE_ERROR', details);
    throw error;
  }
}
