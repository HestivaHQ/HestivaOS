import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkOrderMaterialChangeService } from './work-order-material-change.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrderMaterialChangeService, PrismaService],
})
export class WorkOrdersModule {}
