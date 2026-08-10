import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import {
  CreateCustomerInput,
  CustomersService,
  UpdateCustomerInput,
} from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  create(@Body() input: CreateCustomerInput) {
    return this.customers.create(input);
  }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: CustomerStatus,
  ) {
    return this.customers.findAll(page, pageSize, search, status);
  }

  @Get('selector-options')
  selectorOptions(@Query('search') search?: string) {
    return this.customers.selectorOptions(search);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.customers.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCustomerInput,
  ) {
    return this.customers.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.customers.remove(id);
  }
}
