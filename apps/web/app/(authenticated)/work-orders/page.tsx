import { Suspense } from 'react';
import { createAuthenticatedApi } from '../../../lib/api-server';
import { WorkOrdersManager } from '../../work-orders/work-orders-manager';

function WorkOrdersFallback() {
  return (
    <div className="workOrderWorkspace">
      <section className="routeLoading" aria-live="polite" aria-busy="true">
        <span className="routeLoadingBar" aria-hidden="true" />
        <p>Loading work orders…</p>
      </section>
    </div>
  );
}

async function WorkOrdersData() {
  try {
    const authenticatedApi = await createAuthenticatedApi();
    const [appUser, workOrders] = await Promise.all([
      authenticatedApi.currentUser(),
      authenticatedApi.workOrders('?page=1&pageSize=100'),
    ]);

    return <div className="workOrderWorkspace"><WorkOrdersManager createdById={appUser.id} initialItems={workOrders.items} /></div>;
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

export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<WorkOrdersFallback />}>
      <WorkOrdersData />
    </Suspense>
  );
}
