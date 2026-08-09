import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

type SupabaseUser = { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> };

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; supabaseUser?: SupabaseUser }>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!token || !url || !anonKey) throw new UnauthorizedException('Authentication is required.');
    const response = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anonKey } });
    if (!response.ok) throw new UnauthorizedException('Invalid authentication token.');
    request.supabaseUser = await response.json() as SupabaseUser;
    return true;
  }
}
