import { Body, Controller, Get, Post } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { LaunchBaselineResetService } from './launch-baseline-reset.service';

@Controller('admin/launch-baseline-reset')
@Roles(UserRole.ADMIN)
export class LaunchBaselineResetController {
  constructor(private readonly resetService: LaunchBaselineResetService) {}

  @Get('impact')
  impact() {
    return this.resetService.impact();
  }

  @Post('execute')
  reset(
    @CurrentUser() actor: User,
    @Body() input: { confirmationPhrase?: string; impactFingerprint?: string },
  ) {
    return this.resetService.reset(actor.id, input);
  }
}
