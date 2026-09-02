import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { User, UserRole, UserStatus } from '@prisma/client';
import { SupabaseAdminService } from './supabase-admin.service';
import { UpdateAccessInput, UpdateProfileInput, UpdateRoleInput, UsersService } from './users.service';
import { CurrentUser } from './current-user.decorator';
import { Roles } from './roles.decorator';

type AuthenticatedRequest = {
  supabaseUser: {
    id: string;
    email?: string;
    email_confirmed_at?: string | null;
    user_metadata?: Record<string, unknown>;
  };
  currentUser?: User;
};
type InviteUserInput = { email?: string };
type EmailChangeInput = { email?: string };

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly supabaseAdmin: SupabaseAdminService) {}

  @Post('sync')
  sync(@Req() request: AuthenticatedRequest) {
    const authenticatedEmail = request.supabaseUser.email?.trim().toLowerCase();
    const currentUser = request.currentUser;

    // The global auth guard has already verified the Supabase token, loaded the
    // canonical application User by this exact Auth UUID, and enforced ACTIVE
    // access. Reuse that result for the normal returning-user login path instead
    // of repeating identity queries inside the serializable reconciliation flow.
    if (
      currentUser &&
      currentUser.authUserId === request.supabaseUser.id &&
      authenticatedEmail &&
      currentUser.email.trim().toLowerCase() === authenticatedEmail
    ) {
      return currentUser;
    }

    // New users, stale Auth UUIDs, provider email changes, and any mismatch keep
    // the existing fail-closed reconciliation transaction.
    return this.users.sync(request.supabaseUser);
  }

  @Get('me') findMe(@CurrentUser() user: User) { return user; }
  @Patch('me/profile') updateProfile(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileInput) { return this.users.updateProfile(request.supabaseUser.id, input); }
  @Post('me/email-change/preflight') preflightEmailChange(@Req() request: AuthenticatedRequest, @Body() input: EmailChangeInput) { return this.users.preflightEmailChange(request.supabaseUser.id, input.email ?? ''); }
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
  async updateAccess(@CurrentUser() actor: User, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateAccessInput) {
    const updated = await this.users.updateAccess(actor, id, input);
    if (input.status === UserStatus.INACTIVE) await this.supabaseAdmin.revokeRefreshSessionsForApplicationUser(id);
    return updated;
  }
}
