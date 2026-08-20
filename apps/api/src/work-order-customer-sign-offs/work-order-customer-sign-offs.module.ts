import { Module } from '@nestjs/common';
import { WorkOrderCustomerSignOffsController } from './work-order-customer-sign-offs.controller';
import { WorkOrderCustomerSignOffsService } from './work-order-customer-sign-offs.service';

@Module({
  controllers: [WorkOrderCustomerSignOffsController],
  providers: [WorkOrderCustomerSignOffsService],
})
export class WorkOrderCustomerSignOffsModule {}
