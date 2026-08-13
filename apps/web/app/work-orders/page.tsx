import { createAuthenticatedApi } from '../../lib/api-server';
import { createClient } from '../../lib/supabase/server';
import { AppFrame } from '../components/app-frame';
import { WorkOrdersManager } from './work-orders-manager';

export default async function WorkOrdersPage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('Authenticated user is required.');

    const appUser = await (await createAuthenticatedApi()).syncUser();

    return <AppFrame active="/work-orders" email={user.email} user={appUser}><WorkOrdersManager createdById={appUser.id} /></AppFrame>;
  } catch (error) {
    console.error(
      `WORK_ORDERS_PAGE_ERROR ${JSON.stringify({
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? String(error.cause) : undefined,
        name: error instanceof Error ? error.name : undefined,
      })}`
    );
    throw error;
  }
}
