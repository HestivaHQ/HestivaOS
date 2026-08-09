import { Body, Controller, Get, Patch } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { BusinessProfileInput, BusinessProfileService } from './business-profile.service';

@Controller('admin/business-profile')
@Roles(UserRole.ADMIN)
export class BusinessProfileController {
  constructor(private readonly profiles: BusinessProfileService) {}
  @Get() find() { return this.profiles.find(); }
  @Patch() update(@CurrentUser() actor: User, @Body() input: BusinessProfileInput) { return this.profiles.update(actor.id, input); }
}
