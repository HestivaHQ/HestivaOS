import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { TechnicianStatus } from '@prisma/client';
import { CreateTechnicianInput, TechniciansService, UpdateTechnicianInput } from './technicians.service';

@Controller('technicians')
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Post() create(@Body() input: CreateTechnicianInput) { return this.technicians.create(input); }

  @Get() findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: TechnicianStatus,
  ) { return this.technicians.findAll(page, pageSize, search, status); }

  @Get(':id') findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.technicians.findOne(id); }
  @Patch(':id') update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateTechnicianInput) { return this.technicians.update(id, input); }
  @Delete(':id') remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.technicians.remove(id); }
}
