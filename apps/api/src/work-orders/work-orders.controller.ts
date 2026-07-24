import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { ChangeWorkOrderStatusInput, CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrderAlert, WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Post()
  create(@Body() input: CreateWorkOrderInput) {
    return this.workOrders.create(input);
  }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: WorkOrderStatus,
    @Query('priority') priority?: WorkOrderPriority,
    @Query('customerId', new ParseUUIDPipe({ optional: true })) customerId?: string,
    @Query('propertyId', new ParseUUIDPipe({ optional: true })) propertyId?: string,
    @Query('technicianId', new ParseUUIDPipe({ optional: true })) technicianId?: string,
    @Query('alert') alert?: WorkOrderAlert,
  ) {
    return this.workOrders.findAll(page, pageSize, search, status, priority, customerId, propertyId, technicianId, alert);
  }

  @Get(':id/timeline')
  findTimeline(@Param('id', new ParseUUIDPipe()) id: string) { return this.workOrders.findTimeline(id); }

  @Patch(':id/status')
  changeStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: ChangeWorkOrderStatusInput) {
    return this.workOrders.changeStatus(id, input);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateWorkOrderInput) {
    return this.workOrders.update(id, input);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.workOrders.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.workOrders.remove(id);
  }
}
