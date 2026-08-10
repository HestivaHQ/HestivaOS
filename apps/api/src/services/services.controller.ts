import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ServiceStatus, UserRole } from '@prisma/client';
import { CreateServiceInput, ServicesService, UpdateServiceInput } from './services.service';
import { Roles } from '../users/roles.decorator';

@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() input: CreateServiceInput) {
    return this.services.create(input);
  }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: ServiceStatus,
  ) {
    return this.services.findAll(page, pageSize, search, status);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.services.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateServiceInput) {
    return this.services.update(id, input);
  }

}
