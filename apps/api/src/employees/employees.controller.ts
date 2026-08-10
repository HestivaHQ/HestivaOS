import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { EmployeeInput, EmployeesService } from './employees.service';
@Controller('employees')
@Roles(UserRole.ADMIN)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}
  @Get() list(@Query('search') search?: string, @Query('status') status?: string) { return this.employees.list(search, status); }
  @Get(':id') findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.employees.findOne(id); }
  @Post() create(@Body() input: EmployeeInput & Record<string, unknown>) { return this.employees.create(input); }
  @Patch(':id') update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: EmployeeInput & Record<string, unknown>) { return this.employees.update(id, input); }
}
