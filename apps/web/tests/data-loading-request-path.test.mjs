import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('customers receive server-loaded first-page data without duplicating the mount request', () => {
  const page = read('app/(authenticated)/customers/page.tsx');
  const manager = read('app/customers/customers-manager.tsx');

  assert.match(page, /Promise\.all\(\[/);
  assert.match(page, /initialItems=\{customers\.items\}/);
  assert.match(manager, /useState<Customer\[]>\(initialItems\)/);
  assert.match(manager, /if \(initialLoad\.current\)/);
  assert.match(manager, /setTimeout\(\(\) => setDebouncedSearch\(search\), 300\)/);
});

test('work-order list data starts on the server and editor selectors stay on demand', () => {
  const page = read('app/(authenticated)/work-orders/page.tsx');
  const manager = read('app/work-orders/work-orders-manager.tsx');

  assert.match(page, /authenticatedApi\.workOrders\('\?page=1&pageSize=100'\)/);
  assert.match(page, /initialItems=\{workOrders\.items\}/);
  assert.match(manager, /useState<WorkOrder\[]>\(initialItems\)/);
  assert.match(manager, /const editorOpen = createRoute \|\| editingId !== null \|\| editId !== null/);
  assert.match(manager, /if \(!editorOpen\) return;/);
  assert.match(manager, /href="\/work-orders\/new"/);
  assert.match(manager, /setTimeout\(\(\) => \{ void loadWorkOrders\(\); \}, 300\)/);
});

test('dashboard and attention requests run independently and concurrently', () => {
  const dashboard = read('app/(authenticated)/page.tsx');
  assert.match(dashboard, /Promise\.allSettled\(\[/);
  assert.match(dashboard, /authenticatedApi\.dashboard\(\)/);
  assert.match(dashboard, /authenticatedApi\.attention\('mine'\)/);
});

test('properties load the first list and stable reference data on the server', () => {
  const page = read('app/(authenticated)/properties/page.tsx');
  const manager = read('app/properties/properties-manager.tsx');
  assert.match(page, /authenticatedApi\.properties\('\?page=1&pageSize=100'\)/);
  assert.match(page, /authenticatedApi\.activeBusinessLists\('PROPERTY_TYPE'\)/);
  assert.match(manager, /useState<Property\[]>\(initialItems\)/);
  assert.doesNotMatch(manager, /Promise\.all\(\[api\.properties/);
  assert.match(manager, /api\.customerSelectorOptions\(customerSearch\)/);
});
