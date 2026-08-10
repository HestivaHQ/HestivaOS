import { Body, Controller, Delete, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { CustomerCleanupService } from './customer-cleanup.service';

@Controller('admin/customer-cleanup')
@Roles(UserRole.ADMIN)
export class CustomerCleanupController {
  constructor(private readonly cleanup: CustomerCleanupService) {}

  @Get(':id/impact')
  impact(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.cleanup.impact(id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() actor: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: { confirmationName?: string },
  ) {
    return this.cleanup.remove(actor.id, id, input.confirmationName);
  }
}
