import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, PrismaService],
})
export class WorkOrdersModule {}
