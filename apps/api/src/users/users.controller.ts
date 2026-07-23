import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UpdateProfileInput, UsersService } from './users.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

type AuthenticatedRequest = { supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } };

@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Post('sync') sync(@Req() request: AuthenticatedRequest) { return this.users.sync(request.supabaseUser); }
  @Get('me') findMe(@Req() request: AuthenticatedRequest) { return this.users.findByAuthUserId(request.supabaseUser.id); }
  @Patch('me/profile') updateProfile(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileInput) { return this.users.updateProfile(request.supabaseUser.id, input); }
}
