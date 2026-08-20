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
import {
  CorrespondenceWorkOrderEventsService,
  MaterializeWorkOrderBookingInput,
  MaterializeWorkOrderCompletionInput,
  MaterializeWorkOrderMaterialChangeInput,
} from './correspondence-work-order-events.service';

@Roles(UserRole.ADMIN)
@Controller('correspondence/records')
export class CorrespondenceRecordsController {
  constructor(
    private readonly correspondence: CorrespondenceService,
    private readonly workOrderEvents: CorrespondenceWorkOrderEventsService,
  ) {}

  @Get()
  findAll() { return this.correspondence.findRecords(); }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.correspondence.findRecord(id); }

  @Post('materialize')
  materialize(@CurrentUser() actor: User, @Body() input: MaterializeCorrespondenceInput) {
    return this.correspondence.materialize(actor, input);
  }

  @Post('events/work-orders/:workOrderId/booking/materialize')
  materializeWorkOrderBooking(
    @CurrentUser() actor: User,
    @Param('workOrderId', new ParseUUIDPipe()) workOrderId: string,
    @Body() input: MaterializeWorkOrderBookingInput,
  ) {
    return this.workOrderEvents.materializeBooking(actor, workOrderId, input);
  }

  @Post('events/work-orders/:workOrderId/material-changes/:operationId/reschedule/materialize')
  materializeWorkOrderReschedule(
    @CurrentUser() actor: User,
    @Param('workOrderId', new ParseUUIDPipe()) workOrderId: string,
    @Param('operationId', new ParseUUIDPipe()) operationId: string,
    @Body() input: MaterializeWorkOrderMaterialChangeInput,
  ) {
    return this.workOrderEvents.materializeReschedule(actor, workOrderId, operationId, input);
  }

  @Post('events/work-orders/:workOrderId/material-changes/:operationId/cancellation/materialize')
  materializeWorkOrderCancellation(
    @CurrentUser() actor: User,
    @Param('workOrderId', new ParseUUIDPipe()) workOrderId: string,
    @Param('operationId', new ParseUUIDPipe()) operationId: string,
    @Body() input: MaterializeWorkOrderMaterialChangeInput,
  ) {
    return this.workOrderEvents.materializeCancellation(actor, workOrderId, operationId, input);
  }

  @Post('events/work-orders/:workOrderId/completion/materialize')
  materializeWorkOrderCompletion(
    @CurrentUser() actor: User,
    @Param('workOrderId', new ParseUUIDPipe()) workOrderId: string,
    @Body() input: MaterializeWorkOrderCompletionInput,
  ) {
    return this.workOrderEvents.materializeCompletion(actor, workOrderId, input);
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
