import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { WorkOrdersManager } from './work-orders-manager';

export default async function WorkOrdersPage() {
  try {
    const appUser = await (await createAuthenticatedApi()).syncUser();

    return <AppFrame active="/work-orders" email={appUser.email} user={appUser}><WorkOrdersManager createdById={appUser.id} /></AppFrame>;
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
