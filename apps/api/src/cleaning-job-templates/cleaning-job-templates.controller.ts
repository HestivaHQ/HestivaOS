import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CleaningJobTemplateStatus } from '@prisma/client';
import { CleaningJobTemplatesService, CreateCleaningJobTemplateInput, UpdateCleaningJobTemplateInput } from './cleaning-job-templates.service';

@Controller('cleaning-job-templates')
export class CleaningJobTemplatesController {
  constructor(private readonly templates: CleaningJobTemplatesService) {}

  @Post()
  create(@Body() input: CreateCleaningJobTemplateInput) { return this.templates.create(input); }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: CleaningJobTemplateStatus,
  ) { return this.templates.findAll(page, pageSize, search, status); }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.templates.findOne(id); }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateCleaningJobTemplateInput) { return this.templates.update(id, input); }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.templates.remove(id); }
}