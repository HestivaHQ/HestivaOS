import { describe, expect, it } from '@jest/globals';
import { CORS_ALLOWED_HEADERS, CORS_METHODS, createCorsOptions, getAllowedOrigins } from './cors';

describe('CORS policy', () => {
  it('normalizes configured origins without broadening the allowlist', () => {
    expect(getAllowedOrigins(' https://hestiva.example/ , http://localhost:3000 ')).toEqual([
      'https://hestiva.example',
      'http://localhost:3000',
    ]);
    expect(getAllowedOrigins('https://hestiva.example')).not.toContain('https://arbitrary.example');
  });

  it('permits Employee Records methods and authenticated JSON headers', () => {
    const options = createCorsOptions('https://hestiva.example/');

    expect(options.origin).toEqual(['https://hestiva.example']);
    expect(options.methods).toEqual([...CORS_METHODS]);
    expect(options.methods).toEqual(expect.arrayContaining(['GET', 'POST', 'PATCH']));
    expect(options.allowedHeaders).toEqual(expect.arrayContaining(['Authorization', 'Content-Type']));
    expect(options.credentials).toBe(true);
    expect(CORS_ALLOWED_HEADERS).not.toContain('*');
  });
});
