import { createAuthenticatedApi } from '../../../lib/api-server';
import { AppFrame } from '../../components/app-frame';
import { WorkOrdersManager } from '../work-orders-manager';

export default async function Page({ searchParams }: { searchParams: Promise<{ customerId?: string; propertyId?: string }> }) {
  const user = await (await createAuthenticatedApi()).syncUser();
  const selection = await searchParams;
  return <AppFrame active="/work-orders" email={user.email} user={user}><div className="workOrderWorkspace"><WorkOrdersManager createdById={user.id} createRoute initialCustomerId={selection.customerId} initialPropertyId={selection.propertyId} /></div></AppFrame>;
}