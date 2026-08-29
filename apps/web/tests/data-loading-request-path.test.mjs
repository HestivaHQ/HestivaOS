import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('server data helpers explicitly forward the request-scoped bearer token', () => {
  const serverApi = read('lib/api-server.ts');
  const api = read('lib/api.ts');

  for (const call of [
    'api.customers(query, session.access_token)',
    'api.customerSelectorOptions(search, session.access_token)',
    'api.properties(query, session.access_token)',
    'api.activeBusinessLists(type, session.access_token)',
    'api.workOrders(query, session.access_token)',
  ]) assert.ok(serverApi.includes(call), `${call} must use the request-scoped token`);

  for (const method of ['activeBusinessLists', 'customerSelectorOptions', 'customers', 'properties', 'workOrders']) {
    assert.match(api, new RegExp(`${method}: \\([^)]*accessToken\\?: string\\)`));
  }
  assert.match(api, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(api, /cache: "no-store"/);
});

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

test('quotes start with authenticated server data and retain interactive refresh paths', () => {
  const page = read('app/(authenticated)/quotes/page.tsx');
  const manager = read('app/quotes/quotes-manager.tsx');

  assert.match(page, /if \(appUser\.role !== 'ADMIN'\) redirect\('\/'\)/);
  assert.match(page, /authenticatedApi\.quotes\('\?pageSize=100'\)/);
  assert.match(page, /initialItems=\{quotes\.items\}/);
  assert.match(manager, /useState<QuoteListItem\[]>\(\(\) => actionableOrder\(initialItems\)\)/);
  assert.match(manager, /if \(initialLoad\.current\)/);
  assert.match(manager, /setStatus\(filter\.value\)/);
  assert.match(manager, /setSubmittedSearch\(search\.trim\(\)\)/);
  assert.match(manager, /onClick=\{\(\) => void load\(\)\}>Try again/);
});

test('recurring agreements start on the server while create references stay on demand', () => {
  const page = read('app/(authenticated)/recurring-services/page.tsx');
  const manager = read('app/recurring-services/recurring-services-manager.tsx');

  assert.match(page, /authenticatedApi\.recurringServices\(\)/);
  assert.match(page, /initialItems=\{agreements\}/);
  assert.match(manager, /useState<AgreementWithFutureVisits\[]>\(initialAgreements\)/);
  assert.doesNotMatch(manager, /useEffect\(\(\)=>\{void load/);
  assert.match(manager, /async function openCreate\(\)/);
  assert.match(manager, /Promise\.all\(\[api\.properties\('\?pageSize=100'\),api\.services\('\?pageSize=100'\)\]\)/);
  assert.match(manager, /onClick=\{\(\)=>void openCreate\(\)\}/);
  assert.ok((manager.match(/await loadAgreements\(\)/g) ?? []).length >= 3, 'mutations must refresh only the agreement list');
});

test('new server-first methods forward the request token through no-store transport', () => {
  const serverApi = read('lib/api-server.ts');
  const api = read('lib/api.ts');
  for (const call of [
    'api.quotes(query, session.access_token)',
    'api.recurringServices(session.access_token)',
    'api.shifts(query, session.access_token)',
  ]) assert.ok(serverApi.includes(call), `${call} must use the request-scoped token`);
  for (const method of ['quotes', 'recurringServices', 'shifts']) {
    assert.match(api, new RegExp(`${method}: \\([^)]*accessToken\\?: string\\)`));
  }
});
