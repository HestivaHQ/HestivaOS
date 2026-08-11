import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { RecurringServiceAgreementStatus, User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { AgreementInput, RecurringServiceAgreementsService } from './recurring-service-agreements.service';

@Controller('recurring-services')
@Roles(UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.DISPATCHER, UserRole.SUPERVISOR)
export class RecurringServiceAgreementsController {
  constructor(private readonly agreements: RecurringServiceAgreementsService) {}
  @Get() findAll() { return this.agreements.findAll(); }
  @Get(':id') findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.agreements.findOne(id); }
  @Post() create(@Body() input: AgreementInput) { return this.agreements.create(input); }
  @Patch(':id') update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: Partial<AgreementInput>) { return this.agreements.update(id, input); }
  @Patch(':id/status') status(@Param('id', new ParseUUIDPipe()) id: string, @Body('status') status: RecurringServiceAgreementStatus) { return this.agreements.changeStatus(id, status); }
  @Post(':id/generate') generate(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: User) { return this.agreements.generateNext(id, user.id); }
}
