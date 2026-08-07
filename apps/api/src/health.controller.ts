import { Controller, Get, Res } from '@nestjs/common';
import { APPLICATION_VERSION } from './monitoring/application-version';
import { PrismaService } from './prisma.service';

type DependencyStatus = 'connected' | 'not_configured' | 'unavailable';
type StatusResponse = { status(code: number): void };

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      version: APPLICATION_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness(@Res({ passthrough: true }) response: StatusResponse) {
    const [database, supabase] = await Promise.all([
      this.checkDatabase(),
      this.checkSupabase(),
    ]);
    const ready = database === 'connected' && supabase !== 'unavailable';

    response.status(ready ? 200 : 503);
    return {
      status: ready ? 'ready' : 'not_ready',
      checks: {
        process: 'healthy',
        database,
        supabase,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      return 'unavailable';
    }
  }

  private async checkSupabase(): Promise<DependencyStatus> {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url && !key) return 'not_configured';
    if (!url || !key) return 'unavailable';

    try {
      const result = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(3_000),
      });
      return result.ok ? 'connected' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
}
