import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../app/employees/employee-workforce-links.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/(authenticated)/employees/page.tsx', import.meta.url), 'utf8');

test('Employee Records exposes canonical User and Technician links through the ADMIN UI', () => {
  assert.match(page, /EmployeeWorkforceLinks/);
  assert.match(source, /api\.adminUsers\(token\)/);
  assert.match(source, /api\.technicians\("\?page=1&pageSize=100", token\)/);
  assert.match(source, /Linked OS user/);
  assert.match(source, /Linked Technician/);
  assert.match(source, /api\.updateEmployee[\s\S]*userId:[\s\S]*technicianId:/);
});

test('workforce OS-user options expose email as the stable identity discriminator', () => {
  assert.match(
    source,
    /user\.displayName \|\| `\$\{user\.firstName\} \$\{user\.lastName\}`\.trim\(\) \|\| user\.email\} · \{user\.email\} · \{user\.role\}/,
  );
});

test('workforce linking UI preserves server authorization as the field-access authority', () => {
  assert.match(source, /These links do not create accounts, change application roles, or change[\s\S]*Technician status/);
  assert.match(source, /ACTIVE linked[\s\S]*OS user with the TECHNICIAN application role/);
  assert.match(source, /server remains authoritative for every[\s\S]*Technician request/);
});
