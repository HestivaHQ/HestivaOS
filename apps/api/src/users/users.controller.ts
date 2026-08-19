import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { SupabaseAdminService } from './supabase-admin.service';
import { UpdateAccessInput, UpdateProfileInput, UpdateRoleInput, UsersService } from './users.service';
import { CurrentUser } from './current-user.decorator';
import { Roles } from './roles.decorator';

type AuthenticatedRequest = { supabaseUser: { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> } };
type InviteUserInput = { email?: string };

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly supabaseAdmin: SupabaseAdminService) {}
  @Post('sync') sync(@Req() request: AuthenticatedRequest) { return this.users.sync(request.supabaseUser); }
  @Get('me') findMe(@Req() request: AuthenticatedRequest) { return this.users.findByAuthUserId(request.supabaseUser.id); }
  @Patch('me/profile') updateProfile(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileInput) { return this.users.updateProfile(request.supabaseUser.id, input); }
  @Post('admin/invitations')
  @Roles(UserRole.ADMIN)
  inviteUser(@Body() input: InviteUserInput) { return this.supabaseAdmin.inviteUser(input.email ?? ''); }
  @Get('admin')
  @Roles(UserRole.ADMIN)
  findAdminUsers(@Query('search') search?: string) { return this.users.findAdminUsers(search); }
  @Get(':id/access-history')
  @Roles(UserRole.ADMIN)
  findAccessHistory(@Param('id', new ParseUUIDPipe()) id: string) { return this.users.findAccessHistory(id); }
  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  updateRole(@CurrentUser() actor: User, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateRoleInput) { return this.users.updateRole(actor, id, input); }
  @Patch(':id/access')
  @Roles(UserRole.ADMIN)
  updateAccess(@CurrentUser() actor: User, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateAccessInput) { return this.users.updateAccess(actor, id, input); }
}
