import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { CorrespondenceService, CreateCorrespondenceTemplateInput, CreateCorrespondenceTemplateVersionInput } from './correspondence.service';

@Roles(UserRole.ADMIN)
@Controller('correspondence/templates')
export class CorrespondenceController {
  constructor(private readonly correspondence: CorrespondenceService) {}

  @Get()
  findAll() { return this.correspondence.findAll(); }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.correspondence.findOne(id); }

  @Post()
  create(@Body() input: CreateCorrespondenceTemplateInput) { return this.correspondence.create(input); }

  @Post(':id/versions')
  createVersion(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: CreateCorrespondenceTemplateVersionInput) {
    return this.correspondence.createVersion(id, input);
  }

  @Post(':id/versions/:versionId/publish')
  publish(@Param('id', new ParseUUIDPipe()) id: string, @Param('versionId', new ParseUUIDPipe()) versionId: string) {
    return this.correspondence.publish(id, versionId);
  }

  @Post(':id/versions/:versionId/retire')
  retire(@Param('id', new ParseUUIDPipe()) id: string, @Param('versionId', new ParseUUIDPipe()) versionId: string) {
    return this.correspondence.retire(id, versionId);
  }
}
