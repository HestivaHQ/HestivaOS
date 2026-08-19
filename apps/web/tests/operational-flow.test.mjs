import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { displayCustomerName } from '../lib/customer-display.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const frame = source('../app/components/app-frame.tsx');
const navigation = source('../app/components/app-navigation.tsx');
const mobile = source('../app/components/mobile-app-navigation.tsx');
const customers = source('../app/customers/customers-manager.tsx');
const properties = source('../app/properties/properties-manager.tsx');
const workOrders = source('../app/work-orders/work-orders-manager.tsx');
const adminSettings = source('../app/admin/settings/page.tsx');

test('shared desktop and mobile navigation has the approved operational order', () => {
  const labels = ['Dashboard', 'Customers', 'Properties', 'Work orders', 'Team', 'My profile'];
  const positions = labels.map((label) => frame.indexOf(`label: '${label}'`));
  assert.ok(positions.every((position, index) => position >= 0 && (!index || positions[index - 1] < position)));
  for (const label of ['Technicians', 'Crews', 'Shift Planning']) assert.match(frame, new RegExp(`label: '${label}'`));
  assert.doesNotMatch(frame, /href: '\/employees'|href: '\/services'/);
  assert.match(frame, /MobileAppNavigation[^>]+items=\{navigationItems\}/);
  assert.match(mobile, /<AppNavigation[^>]+items=\{items\}/);
});

test('Team is an accessible disclosure and closes the mobile drawer on child navigation', () => {
  assert.match(navigation, /<button[^>]+type="button"[^>]+aria-expanded=\{groupOpen\}/);
  assert.match(navigation, /childActive/);
  assert.match(navigation, /onClick=\{onNavigate\}/);
  assert.match(mobile, /onNavigate=\{\(\) => setOpen\(false\)\}/);
});

test('Admin Settings owns Employee Records and Services', () => {
  assert.match(adminSettings, /href="\/employees"[^>]*><h3>Employee Records/);
  assert.match(adminSettings, /href="\/admin\/settings\/services"[^>]*><h3>Services/);
});

test('customer form uses required Contact name without a Name field', () => {
  assert.match(customers, /<label>Contact name<input required/);
  assert.doesNotMatch(customers, /<label>Name<input/);
});

test('customer display prefers contact name and safely supports legacy records', () => {
  assert.equal(displayCustomerName({ contactName: 'Current Contact', name: 'Historical Name' }), 'Current Contact');
  assert.equal(displayCustomerName({ contactName: null, name: 'Historical Name' }), 'Historical Name');
  assert.equal(displayCustomerName({ contactName: null, name: '' }), 'Customer');
  assert.match(properties, /displayCustomerName\(c\)/);
  assert.match(workOrders, /displayCustomerName\(c\)/);
});

test('create continues with a validated canonical ID while edit and failures do not navigate', () => {
  assert.match(customers, /if \(editingId\) await api\.updateCustomer/);
  assert.match(customers, /!customer\?\.id/);
  assert.match(customers, /window\.location\.assign\(`\/properties\?mode=create&customerId=/);
  assert.match(customers, /catch \(err\)/);
});

test('property creation still continues to work order with both canonical IDs', () => {
  assert.match(properties, /preselectedCustomerId/);
  assert.match(properties, /property\.customerId/);
  assert.match(properties, /property\.id/);
  assert.match(properties, /\/work-orders\/new\?customerId=/);
  assert.match(workOrders, /item\.id === preselectedPropertyId && item\.customerId === customer\?\.id/);
});
