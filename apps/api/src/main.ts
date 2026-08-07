import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APPLICATION_VERSION } from './monitoring/application-version';
import { StructuredExceptionFilter } from './monitoring/http-exception.filter';
import { JsonLogger } from './monitoring/json-logger';

async function bootstrap(): Promise<void> {
  const startedAt = process.hrtime.bigint();
  const logger = new JsonLogger();
  const app = await NestFactory.create(AppModule, { logger });
  app.useGlobalFilters(new StructuredExceptionFilter(app.get(HttpAdapterHost)));
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  const startupDurationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  logger.event('info', {
    event: 'startup_complete',
    version: APPLICATION_VERSION,
    environment: process.env.NODE_ENV ?? 'development',
    startupDurationMs: Number(startupDurationMs.toFixed(3)),
    port,
    status: 'started',
  });
}

bootstrap().catch((error: unknown) => {
  const logger = new JsonLogger();
  const startupError = error instanceof Error ? error : new Error('Unknown startup error');
  logger.event('error', {
    event: 'startup_failed',
    version: APPLICATION_VERSION,
    environment: process.env.NODE_ENV ?? 'development',
  }, startupError.stack);
  process.exit(1);
});
