import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateChecklistItemInput, UpdateChecklistItemInput, WorkOrderChecklistsService } from './work-order-checklists.service';

@Controller('work-orders/:workOrderId/checklist')
export class WorkOrderChecklistsController {
  constructor(private readonly checklists: WorkOrderChecklistsService) {}

  @Get()
  findAll(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string) {
    return this.checklists.findAll(workOrderId);
  }

  @Post()
  create(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string, @Body() input: CreateChecklistItemInput) {
    return this.checklists.create(workOrderId, input);
  }

  @Patch(':id')
  update(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateChecklistItemInput) {
    return this.checklists.update(workOrderId, id, input);
  }

  @Delete(':id')
  remove(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.checklists.remove(workOrderId, id);
  }
}
