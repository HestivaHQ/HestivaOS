import { createAuthenticatedApi } from '../../../lib/api-server';
import { AppFrame } from '../../components/app-frame';
import { InterruptedVisitAdminPanel } from './interrupted-visit-admin-panel';
import { MaterialChangeAdminPanel } from './material-change-admin-panel';
import { ScopeMismatchAdminPanel } from './scope-mismatch-admin-panel';
import { TechnicianJobView } from './technician-job-view';
import { AccessReadinessPanel } from './access-readiness-panel';
import { TemporaryAccessCredentialsPanel } from './temporary-access-credentials-panel';
import { AccessRecoveryPanel } from './access-recovery-panel';
import { IncidentAdminPanel } from './incident-admin-panel';
import { CompletionCorrectionPanel } from './completion-correction-panel';
import { ScopeRevisionPanel } from './scope-revision-panel';

export default async function TechnicianJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appUser = await (await createAuthenticatedApi()).syncUser();
  const canReadInterruption = ['ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'].includes(appUser.role);
  const canRouteInterruption = appUser.role === 'ADMIN' || appUser.role === 'SUPERVISOR';
  return <AppFrame active="/work-orders" email={appUser.email} user={appUser}>
    <div className="workOrderWorkspace">
      <TechnicianJobView workOrderId={id} canAcknowledgeCompletion={canRouteInterruption} />
      {canRouteInterruption ? <CompletionCorrectionPanel workOrderId={id} /> : null}
      {canRouteInterruption ? <AccessReadinessPanel workOrderId={id} /> : null}
      {appUser.role === 'ADMIN' ? <AccessRecoveryPanel workOrderId={id} /> : null}
      {appUser.role === 'ADMIN' ? <TemporaryAccessCredentialsPanel workOrderId={id} /> : null}
      {canReadInterruption ? <InterruptedVisitAdminPanel workOrderId={id} canRoute={canRouteInterruption} /> : null}
      {canRouteInterruption ? <IncidentAdminPanel workOrderId={id} /> : null}
      {appUser.role === 'ADMIN' ? <ScopeMismatchAdminPanel workOrderId={id} /> : null}
      {appUser.role === 'ADMIN' ? <MaterialChangeAdminPanel workOrderId={id} /> : null}
      {appUser.role === 'ADMIN' ? <ScopeRevisionPanel workOrderId={id} /> : null}
    </div>
  </AppFrame>;
}