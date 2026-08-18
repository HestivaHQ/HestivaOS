import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkOrderInterruptionService } from './work-order-interruption.service';
import { WorkOrderInterruptionsController } from './work-order-interruptions.controller';
import { WorkOrderMaterialChangeService } from './work-order-material-change.service';
import { WorkOrderReplacementVisitService } from './work-order-replacement-visit.service';
import { WorkOrderScopeMismatchService } from './work-order-scope-mismatch.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  controllers: [WorkOrdersController, WorkOrderInterruptionsController],
  providers: [WorkOrdersService, WorkOrderMaterialChangeService, WorkOrderScopeMismatchService, WorkOrderInterruptionService, WorkOrderReplacementVisitService, PrismaService],
  exports: [WorkOrderInterruptionService, WorkOrderReplacementVisitService],
})
export class WorkOrdersModule {}
