import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
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

@Module({
  controllers: [WorkOrdersController, WorkOrderInterruptionsController],
  providers: [WorkOrderIncidentService, WorkOrderAccessRecoveryService, WorkOrdersService, WorkOrderAccessReadinessService, WorkOrderTemporaryAccessCredentialsService, WorkOrderMaterialChangeService, WorkOrderScopeMismatchService, WorkOrderInterruptionService, WorkOrderReplacementVisitService, PrismaService],
  exports: [WorkOrderInterruptionService, WorkOrderReplacementVisitService, WorkOrderIncidentService],
})
export class WorkOrdersModule {}
