import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateCustomerSignOffInput, WorkOrderCustomerSignOffsService } from './work-order-customer-sign-offs.service';

@Controller('work-orders/:workOrderId/customer-sign-off')
export class WorkOrderCustomerSignOffsController {
  constructor(private readonly signOffs: WorkOrderCustomerSignOffsService) {}

  @Get()
  findOne(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string) {
    return this.signOffs.findOne(workOrderId);
  }

  @Post()
  create(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string, @Body() input: CreateCustomerSignOffInput) {
    return this.signOffs.create(workOrderId, input);
  }
}
