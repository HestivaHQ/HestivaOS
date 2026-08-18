import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { User, UserRole, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { MaterialChangePreviewInput, WorkOrderMaterialChangeService } from './work-order-material-change.service';
import { ChangeWorkOrderStatusInput, CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrderAlert, WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(
    private readonly workOrders: WorkOrdersService,
    private readonly materialChanges: WorkOrderMaterialChangeService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
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
    @Query('crewId', new ParseUUIDPipe({ optional: true })) crewId?: string,
    @Query('alert') alert?: WorkOrderAlert,
  ) {
    return this.workOrders.findAll(page, pageSize, search, status, priority, customerId, propertyId, technicianId, crewId, alert);
  }

  @Get(':id/timeline')
  findTimeline(@Param('id', new ParseUUIDPipe()) id: string) { return this.workOrders.findTimeline(id); }

  @Post(':id/completion/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  acknowledgeCompletion(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: User) {
    return this.workOrders.acknowledgeCompletion(id, actor.id);
  }

  @Post(':id/material-change/preview')
  @Roles(UserRole.ADMIN)
  previewMaterialChange(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: MaterialChangePreviewInput,
  ) {
    return this.materialChanges.preview(id, input);
  }

  @Patch(':id/status')
  async changeStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: ChangeWorkOrderStatusInput) {
    await this.materialChanges.assertGenericCancellationAllowed(id, input.status);
    return this.workOrders.changeStatus(id, input);
  }

  @Patch(':id/assignment')
  @Roles(UserRole.ADMIN)
  assignTechnicians(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: { technicianIds: string[]; crewId?: string | null; jobLeaderId?: string | null },
    @CurrentUser() actor: User,
  ) {
    return this.workOrders.assignTechnicians(id, input.technicianIds ?? [], input.crewId, input.jobLeaderId, actor.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateWorkOrderInput) {
    await this.materialChanges.assertGenericUpdateAllowed(id, input);
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
