import { BadGatewayException, BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);
  private readonly client: SupabaseClient | null;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    this.client = url && serviceRoleKey
      ? createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  }

  async inviteUser(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new BadRequestException('A valid email address is required.');
    if (!this.client) throw new ServiceUnavailableException('Supabase administrator operations are not configured.');

    const { data, error } = await this.client.auth.admin.inviteUserByEmail(email);
    if (error || !data.user) {
      this.logger.warn(`supabase_admin_invite_failed email=${email} status=${error?.status ?? 'unknown'}`);
      throw new BadGatewayException('Supabase could not send the invitation.');
    }

    this.logger.log(`supabase_admin_invite_sent authUserId=${data.user.id}`);
    return { authUserId: data.user.id, email, invited: true };
  }

  async revokeRefreshSessions(authUserId: string) {
    if (!authUserId?.trim()) return;
    try {
      // HestivaOS authorization is revoked independently through User.status. Removing
      // provider sessions prevents refresh without deleting the Supabase Auth identity.
      await this.prisma.$executeRaw`DELETE FROM auth.sessions WHERE user_id = ${authUserId}::uuid`;
      this.logger.log(`supabase_refresh_sessions_revoked authUserId=${authUserId}`);
    } catch (error) {
      this.logger.error(`supabase_refresh_session_revocation_failed authUserId=${authUserId}`);
      throw new ServiceUnavailableException('OS access is disabled, but provider session revocation could not be completed.');
    }
  }
}
