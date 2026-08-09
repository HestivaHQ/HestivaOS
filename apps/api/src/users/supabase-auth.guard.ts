import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';

type SupabaseUser = { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> };

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; url?: string; supabaseUser?: SupabaseUser; currentUser?: User }>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!token || !url || !anonKey) throw new UnauthorizedException('Authentication is required.');
    const response = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anonKey } });
    if (!response.ok) throw new UnauthorizedException('Invalid authentication token.');
    request.supabaseUser = await response.json() as SupabaseUser;
    const currentUser = await this.prisma.user.findUnique({ where: { authUserId: request.supabaseUser.id } });
    const isSync = request.url?.split('?')[0].endsWith('/users/sync');
    if (!currentUser) {
      if (isSync) return true;
      throw new UnauthorizedException('Application user profile is required.');
    }
    if (currentUser.status !== UserStatus.ACTIVE) throw new ForbiddenException('Hestiva OS access is disabled.');
    request.currentUser = currentUser;
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (roles && !roles.includes(currentUser.role)) throw new ForbiddenException('Administrator access is required.');
    return true;
  }
}
