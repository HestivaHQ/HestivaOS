import { createAuthenticatedApi } from '../../../../lib/api-server';
import { InterruptedVisitAdminPanel } from '../../../work-orders/[id]/interrupted-visit-admin-panel';
import { MaterialChangeAdminPanel } from '../../../work-orders/[id]/material-change-admin-panel';
import { ScopeMismatchAdminPanel } from '../../../work-orders/[id]/scope-mismatch-admin-panel';
import { TechnicianJobView } from '../../../work-orders/[id]/technician-job-view';
import { AccessReadinessPanel } from '../../../work-orders/[id]/access-readiness-panel';
import { TemporaryAccessCredentialsPanel } from '../../../work-orders/[id]/temporary-access-credentials-panel';
import { AccessRecoveryPanel } from '../../../work-orders/[id]/access-recovery-panel';
import { IncidentAdminPanel } from '../../../work-orders/[id]/incident-admin-panel';
import { CompletionCorrectionPanel } from '../../../work-orders/[id]/completion-correction-panel';
import { ScopeRevisionPanel } from '../../../work-orders/[id]/scope-revision-panel';

export default async function TechnicianJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appUser = await (await createAuthenticatedApi()).currentUser();
  const canReadInterruption = ['ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'].includes(appUser.role);
  const canRouteInterruption = appUser.role === 'ADMIN' || appUser.role === 'SUPERVISOR';
  return <>
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
  </>;
}