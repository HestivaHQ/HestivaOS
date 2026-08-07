import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type PackageMetadata = { version?: unknown };

function readApplicationVersion(): string {
  const metadata = JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
  ) as PackageMetadata;

  return typeof metadata.version === 'string' ? metadata.version : 'unknown';
}

export const APPLICATION_VERSION = readApplicationVersion();
