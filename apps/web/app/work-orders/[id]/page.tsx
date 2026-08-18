import { createAuthenticatedApi } from '../../../lib/api-server';
import { AppFrame } from '../../components/app-frame';
import { InterruptedVisitAdminPanel } from './interrupted-visit-admin-panel';
import { MaterialChangeAdminPanel } from './material-change-admin-panel';
import { ScopeMismatchAdminPanel } from './scope-mismatch-admin-panel';
import { TechnicianJobView } from './technician-job-view';

export default async function TechnicianJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appUser = await (await createAuthenticatedApi()).syncUser();
  const canReadInterruption = ['ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'].includes(appUser.role);
  const canRouteInterruption = appUser.role === 'ADMIN' || appUser.role === 'SUPERVISOR';
  return <AppFrame active="/work-orders" email={appUser.email} user={appUser}>
    <TechnicianJobView workOrderId={id} canAcknowledgeCompletion={canRouteInterruption} />
    {canReadInterruption ? <InterruptedVisitAdminPanel workOrderId={id} canRoute={canRouteInterruption} /> : null}
    {appUser.role === 'ADMIN' ? <ScopeMismatchAdminPanel workOrderId={id} /> : null}
    {appUser.role === 'ADMIN' ? <MaterialChangeAdminPanel workOrderId={id} /> : null}
  </AppFrame>;
}
