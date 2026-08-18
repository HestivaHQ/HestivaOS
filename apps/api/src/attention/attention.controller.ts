import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { AttentionService } from './attention.service';

@Controller('attention')
@Roles(
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
  UserRole.DISPATCHER,
  UserRole.SUPERVISOR,
)
export class AttentionController {
  constructor(private readonly attention: AttentionService) {}

  @Get()
  list(@CurrentUser() user: User, @Query('view') view?: string) {
    return this.attention.list(user, view);
  }

  @Patch(':id/seen')
  markSeen(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.attention.markSeen(id, user);
  }

  @Patch(':id/assignment')
  assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: { ownerId?: string | null },
    @CurrentUser() user: User,
  ) {
    return this.attention.assign(id, input.ownerId ?? null, user);
  }
}
