import { createAuthenticatedApi } from '../../../../lib/api-server';
import { WorkOrdersManager } from '../../../work-orders/work-orders-manager';

export default async function Page({ searchParams }: { searchParams: Promise<{ customerId?: string; propertyId?: string }> }) {
  const user = await (await createAuthenticatedApi()).currentUser();
  const selection = await searchParams;
  return <><div className="workOrderWorkspace"><WorkOrdersManager createdById={user.id} createRoute initialCustomerId={selection.customerId} initialPropertyId={selection.propertyId} /></div></>;
}