import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const apiSource = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');

test('Employee Records uses the shared API request path with bearer authorization', () => {
  assert.match(
    apiSource,
    /employees:\s*\(accessToken: string, query = ["']{2}\)\s*=>\s*apiFetch<EmployeeRecord\[\]>/,
  );
  assert.match(
    apiSource,
    /createEmployee:[\s\S]{0,800}?method:\s*["']POST["'][\s\S]{0,800}?Authorization:\s*`Bearer \$\{accessToken\}`/,
  );
  assert.match(
    apiSource,
    /updateEmployee:[\s\S]{0,800}?method:\s*["']PATCH["'][\s\S]{0,800}?Authorization:\s*`Bearer \$\{accessToken\}`/,
  );
});
