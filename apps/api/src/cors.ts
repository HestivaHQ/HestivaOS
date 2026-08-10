import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const CORS_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'] as const;
export const CORS_ALLOWED_HEADERS = ['Authorization', 'Content-Type'] as const;

export function getAllowedOrigins(value = process.env.CORS_ALLOWED_ORIGINS): string[] {
  const configured = value?.split(',') ?? ['http://localhost:3000'];
  return configured
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function createCorsOptions(value = process.env.CORS_ALLOWED_ORIGINS): CorsOptions {
  return {
    origin: getAllowedOrigins(value),
    methods: [...CORS_METHODS],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    credentials: true,
  };
}
