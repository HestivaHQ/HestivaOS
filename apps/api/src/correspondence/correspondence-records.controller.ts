import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import {
  CorrespondenceService,
  CreateCorrespondenceDeliveryAttemptInput,
  MaterializeCorrespondenceInput,
  RecordCorrespondenceDeliveryOutcomeInput,
} from './correspondence.service';

@Roles(UserRole.ADMIN)
@Controller('correspondence/records')
export class CorrespondenceRecordsController {
  constructor(private readonly correspondence: CorrespondenceService) {}

  @Get()
  findAll() { return this.correspondence.findRecords(); }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.correspondence.findRecord(id); }

  @Post('materialize')
  materialize(@CurrentUser() actor: User, @Body() input: MaterializeCorrespondenceInput) {
    return this.correspondence.materialize(actor, input);
  }

  @Get(':id/delivery-attempts')
  findDeliveryAttempts(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.correspondence.findDeliveryAttempts(id);
  }

  @Post(':id/delivery-attempts')
  createDeliveryAttempt(
    @CurrentUser() actor: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CreateCorrespondenceDeliveryAttemptInput,
  ) {
    return this.correspondence.createDeliveryAttempt(actor, id, input);
  }

  @Post('delivery-attempts/:attemptId/outcomes')
  recordDeliveryOutcome(
    @CurrentUser() actor: User,
    @Param('attemptId', new ParseUUIDPipe()) attemptId: string,
    @Body() input: RecordCorrespondenceDeliveryOutcomeInput,
  ) {
    return this.correspondence.recordDeliveryOutcome(actor, attemptId, input);
  }
}
