import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const propertyForm = readFileSync(new URL('../app/properties/properties-manager.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../app/admin/settings/page.tsx', import.meta.url), 'utf8');
const cleanup = readFileSync(new URL('../app/admin/settings/customer-data-cleanup/customer-data-cleanup.tsx', import.meta.url), 'utf8');
test('Property Type keeps its null prompt and uses canonical Admin Business Lists', () => {
  assert.match(propertyForm, />Select property type</);
  assert.match(propertyForm, /\/admin\/settings\/business-lists/);
  assert.doesNotMatch(propertyForm, /employees#business-lists/);
  assert.match(settings, /\/admin\/settings\/business-lists/);
});
test('Customer cleanup requires exact typed confirmation and irreversible two-step action', () => {
  assert.match(cleanup, /Delete customer file/);
  assert.match(cleanup, /Permanently delete customer file/);
  assert.match(cleanup, /confirmation !== impact\.customerName/);
  assert.match(cleanup, /This action cannot be undone/);
});
