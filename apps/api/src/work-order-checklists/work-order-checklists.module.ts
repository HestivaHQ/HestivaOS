import { Module } from '@nestjs/common';
import { WorkOrderChecklistsController } from './work-order-checklists.controller';
import { WorkOrderChecklistsService } from './work-order-checklists.service';

@Module({
  controllers: [WorkOrderChecklistsController],
  providers: [WorkOrderChecklistsService],
})
export class WorkOrderChecklistsModule {}
