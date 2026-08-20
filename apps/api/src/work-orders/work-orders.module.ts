import { Module } from '@nestjs/common';
import { WorkOrderInterruptionService } from './work-order-interruption.service';
import { WorkOrderInterruptionsController } from './work-order-interruptions.controller';
import { WorkOrderMaterialChangeService } from './work-order-material-change.service';
import { WorkOrderReplacementVisitService } from './work-order-replacement-visit.service';
import { WorkOrderScopeMismatchService } from './work-order-scope-mismatch.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderAccessReadinessService } from './work-order-access-readiness.service';
import { WorkOrderTemporaryAccessCredentialsService } from './work-order-temporary-access-credentials.service';
import { WorkOrderAccessRecoveryService } from './work-order-access-recovery.service';
import { WorkOrderIncidentService } from './work-order-incident.service';
import { ExecutionEvidenceAccessService } from '../execution-evidence/execution-evidence-access.service';
import { WorkOrderCompletionCorrectionService } from './work-order-completion-correction.service';

@Module({
  controllers: [WorkOrdersController, WorkOrderInterruptionsController],
  providers: [WorkOrderCompletionCorrectionService, ExecutionEvidenceAccessService, WorkOrderIncidentService, WorkOrderAccessRecoveryService, WorkOrdersService, WorkOrderAccessReadinessService, WorkOrderTemporaryAccessCredentialsService, WorkOrderMaterialChangeService, WorkOrderScopeMismatchService, WorkOrderInterruptionService, WorkOrderReplacementVisitService],
  exports: [WorkOrderCompletionCorrectionService, ExecutionEvidenceAccessService, WorkOrderInterruptionService, WorkOrderReplacementVisitService, WorkOrderIncidentService],
})
export class WorkOrdersModule {}
