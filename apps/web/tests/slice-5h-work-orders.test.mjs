import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cleanup = readFileSync(new URL('../app/admin/settings/customer-data-cleanup/customer-data-cleanup.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/styles.css', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../app/work-orders/work-orders-manager.tsx', import.meta.url), 'utf8');
const display = readFileSync(new URL('../lib/work-order-display.ts', import.meta.url), 'utf8');

test('cleanup confirmation remains exact and explains a case mismatch until corrected', () => {
  assert.match(cleanup, /confirmation !== impact\.customerName/);
  assert.match(cleanup, /Name does not match\. Type “\{impact\.customerName\}” exactly\./);
  assert.match(cleanup, /role="alert"/);
});

test('cleanup destructive disabled label uses an opaque readable treatment', () => {
  assert.match(styles, /\.cleanupDeleteButton:disabled[^}]+opacity: 1/);
  assert.match(styles, /\.cleanupDeleteButton:disabled[^}]+color: #641d18/);
});

test('new work orders use controlled service and no manual title field', () => {
  assert.match(manager, /<label>Service<select required/);
  assert.doesNotMatch(manager, /<label>Title<input/);
  assert.match(manager, /Automatically generated when the job is created/);
});

test('display prefers structured relationships and retains legacy title fallback', () => {
  assert.match(display, /workOrder\.service\?\.name/);
  assert.match(display, /workOrder\.title \|\|/);
  assert.match(display, /workOrder\.reference \|\| workOrder\.title/);
});
