import { createAuthenticatedApi } from '../../../lib/api-server';
import { WorkOrdersManager } from '../../work-orders/work-orders-manager';

export default async function WorkOrdersPage() {
  try {
    const appUser = await (await createAuthenticatedApi()).currentUser();

    return <><div className="workOrderWorkspace"><WorkOrdersManager createdById={appUser.id} /></div></>;
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