import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { LaunchBaselineResetService } from './launch-baseline-reset.service';

const RESET_ENABLED_ENV = 'HESTIVA_LAUNCH_BASELINE_RESET_ENABLED';
const RESET_DISABLED_MESSAGE = 'Launch-baseline reset is disabled. Explicitly enable the pre-launch reset window in the API runtime before use.';

@Controller('admin/launch-baseline-reset')
@Roles(UserRole.ADMIN)
export class LaunchBaselineResetController {
  constructor(private readonly resetService: LaunchBaselineResetService) {}

  private enabled() {
    return process.env[RESET_ENABLED_ENV]?.trim().toLowerCase() === 'true';
  }

  @Get('impact')
  async impact() {
    const impact = await this.resetService.impact();
    if (this.enabled()) return impact;
    return { ...impact, ready: false, blockers: [...impact.blockers, RESET_DISABLED_MESSAGE] };
  }

  @Post('execute')
  reset(
    @CurrentUser() actor: User,
    @Body() input: { confirmationPhrase?: string; impactFingerprint?: string },
  ) {
    if (!this.enabled()) throw new ConflictException(RESET_DISABLED_MESSAGE);
    return this.resetService.reset(actor.id, input);
  }
}
