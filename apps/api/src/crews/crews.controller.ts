import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CrewStatus } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { CreateCrewInput, CrewsService, UpdateCrewInput } from './crews.service';

@Controller('crews')
export class CrewsController {
  constructor(private readonly crews: CrewsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() input: CreateCrewInput) { return this.crews.create(input); }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: CrewStatus,
  ) { return this.crews.findAll(page, pageSize, search, status); }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.crews.findOne(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateCrewInput) { return this.crews.update(id, input); }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.crews.remove(id); }
}
