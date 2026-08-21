import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export const PRISMA_CONNECTION_LIMIT = 5;

export function withPrismaConnectionLimit(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set('connection_limit', String(PRISMA_CONNECTION_LIMIT));
  return url.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    super(
      databaseUrl
        ? {
            datasources: {
              db: { url: withPrismaConnectionLimit(databaseUrl) },
            },
          }
        : undefined,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
