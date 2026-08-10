import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const apiSource = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');

test('Employee Records uses the shared API request path with bearer authorization', () => {
  assert.match(apiSource, /employees: \(accessToken: string, query = ''\) => apiFetch<EmployeeRecord\[]>/);
  assert.match(apiSource, /createEmployee:[^\n]+method: 'POST'[^\n]+Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(apiSource, /updateEmployee:[^\n]+method: 'PATCH'[^\n]+Authorization: `Bearer \$\{accessToken\}`/);
});
