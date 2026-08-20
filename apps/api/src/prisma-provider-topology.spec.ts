import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

describe('Prisma provider topology', () => {
  it('registers PrismaService only in the global DatabaseModule', () => {
    const moduleFiles: string[] = [];

    const collectModuleFiles = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          collectModuleFiles(path);
        } else if (entry.isFile() && entry.name.endsWith('.module.ts')) {
          moduleFiles.push(path);
        }
      }
    };

    collectModuleFiles(__dirname);

    const registrations = moduleFiles
      .filter((path) => readFileSync(path, 'utf8').includes('PrismaService'))
      .map((path) => relative(__dirname, path).replaceAll('\\', '/'))
      .sort();

    expect(registrations).toEqual(['database.module.ts']);

    const appModule = readFileSync(join(__dirname, 'app.module.ts'), 'utf8');
    expect(appModule).toContain("import { DatabaseModule } from './database.module';");
    expect(appModule).toMatch(/imports:\s*\[DatabaseModule,/);
  });

  it('does not require a database connection during application bootstrap', () => {
    const prismaService = readFileSync(join(__dirname, 'prisma.service.ts'), 'utf8');

    expect(prismaService).not.toContain('OnModuleInit');
    expect(prismaService).not.toContain('onModuleInit');
    expect(prismaService).not.toContain('this.$connect()');
    expect(prismaService).toContain('this.$disconnect()');
  });
});
