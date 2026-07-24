import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkOrderChecklistsController } from './work-order-checklists.controller';
import { WorkOrderChecklistsService } from './work-order-checklists.service';

@Module({
  controllers: [WorkOrderChecklistsController],
  providers: [WorkOrderChecklistsService, PrismaService],
})
export class WorkOrderChecklistsModule {}
