import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ShiftStatus } from '@prisma/client';
import { CopyShiftInput, CreateShiftInput, ShiftsService, UpdateShiftInput } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Post()
  create(@Body() input: CreateShiftInput) { return this.shifts.create(input); }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: ShiftStatus,
    @Query('crewId', new ParseUUIDPipe({ optional: true })) crewId?: string,
    @Query('technicianId', new ParseUUIDPipe({ optional: true })) technicianId?: string,
    @Query('workOrderId', new ParseUUIDPipe({ optional: true })) workOrderId?: string,
  ) { return this.shifts.findAll(page, pageSize, dateFrom, dateTo, status, crewId, technicianId, workOrderId); }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.shifts.findOne(id); }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateShiftInput) { return this.shifts.update(id, input); }

  @Post(':id/copy')
  copy(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: CopyShiftInput) { return this.shifts.copy(id, input); }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.shifts.remove(id); }
}
