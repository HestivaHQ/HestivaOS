import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { InterruptJobInput, WorkOrderInterruptionService } from '../work-orders/work-order-interruption.service';

@Controller('technician/jobs')
export class TechnicianInterruptionsController {
  constructor(private readonly interruptions: WorkOrderInterruptionService) {}

  @Post(':id/interrupt')
  interrupt(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: InterruptJobInput,
  ) {
    return this.interruptions.interrupt(user.id, id, input);
  }
}
