import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('remaining high-frequency list pages receive server-loaded initial data', async () => {
  const [techniciansPage, crewsPage, servicesPage, adminServicesPage, serverApi] = await Promise.all([
    read('app/(authenticated)/technicians/page.tsx'),
    read('app/(authenticated)/crews/page.tsx'),
    read('app/(authenticated)/services/page.tsx'),
    read('app/(authenticated)/admin/settings/services/page.tsx'),
    read('lib/api-server.ts'),
  ]);

  assert.match(techniciansPage, /authenticatedApi\.technicians/);
  assert.match(techniciansPage, /initialItems=/);
  assert.match(crewsPage, /Promise\.all/);
  assert.match(crewsPage, /authenticatedApi\.crews/);
  assert.match(crewsPage, /authenticatedApi\.technicians/);
  assert.match(servicesPage, /authenticatedApi\.services/);
  assert.match(adminServicesPage, /authenticatedApi\.services/);
  assert.match(serverApi, /technicians: \(query = ''\) => api\.technicians\(query, session\.access_token\)/);
  assert.match(serverApi, /crews: \(query = ''\) => api\.crews\(query, session\.access_token\)/);
  assert.match(serverApi, /services: \(query = ''\) => api\.services\(query, session\.access_token\)/);
});

test('list managers skip their hydration-time duplicate read but retain search debounce', async () => {
  const [technicians, crews, services, adminServices] = await Promise.all([
    read('app/technicians/technicians-manager.tsx'),
    read('app/crews/crews-manager.tsx'),
    read('app/services/services-catalogue.tsx'),
    read('app/admin/settings/services/services-manager.tsx'),
  ]);

  for (const source of [technicians, crews, services, adminServices]) {
    assert.match(source, /initialSearch\.current/);
    assert.match(source, /return;/);
    assert.match(source, /setTimeout/);
  }
  assert.doesNotMatch(crews, /loadTechnicians/);
});
