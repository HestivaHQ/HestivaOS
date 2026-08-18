import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { RouteInterruptionInput, WorkOrderInterruptionService } from './work-order-interruption.service';

@Controller('work-orders')
export class WorkOrderInterruptionsController {
  constructor(private readonly interruptions: WorkOrderInterruptionService) {}

  @Get(':id/interruption')
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.SUPERVISOR)
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.interruptions.detail(id);
  }

  @Post(':id/interruption/route')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  route(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: RouteInterruptionInput,
    @CurrentUser() actor: User,
  ) {
    return this.interruptions.route(id, input, actor.id);
  }
}
