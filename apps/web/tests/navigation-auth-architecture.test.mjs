import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('middleware verifies signed claims locally and fails protected routes closed', () => {
  const middleware = read('middleware.ts');
  assert.match(middleware, /auth\.getClaims\(\)/);
  assert.doesNotMatch(middleware, /auth\.getUser\(\)/);
  assert.match(middleware, /!authenticated && !isPublicRoute/);
  assert.match(middleware, /pathname === '\/quote'/);
  assert.match(middleware, /loginUrl\.pathname = '\/login'/);
});

test('authenticated layout owns one persistent role-sensitive Homent shell', () => {
  const layout = read('app/(authenticated)/layout.tsx');
  const shell = read('app/components/app-frame.tsx');
  assert.match(layout, /currentUser\(\)/);
  assert.match(layout, /<AppFrame user=\{user\}>\{children\}<\/AppFrame>/);
  assert.match(shell, /usePathname\(\)/);
  assert.match(shell, /pathname\.startsWith\('\/work-orders\/'\)/);
  assert.match(shell, /user\.role === 'SUPERVISOR'/);
  assert.match(shell, /user\.role === 'ADMIN'/);
  assert.match(shell, /Shift Planning/);
});

test('ordinary pages do not reconcile identities or instantiate duplicate shells', () => {
  const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(new URL(`${entry.name}/`, directory)) : entry.name === 'page.tsx' ? [new URL(entry.name, directory)] : []);
  const pages = walk(new URL('../app/(authenticated)/', import.meta.url)).map((url) => `app/(authenticated)/${url.pathname.split('/app/(authenticated)/')[1]}`);
  assert.ok(pages.length > 20);
  for (const page of pages) {
    const source = read(page);
    assert.doesNotMatch(source, /syncUser\(/, page);
    assert.doesNotMatch(source, /AppFrame/, page);
  }
});

test('read-only current user is used for navigation while login retains reconciliation', () => {
  const serverApi = read('lib/api-server.ts');
  const api = read('lib/api.ts');
  const login = read('app/login/page.tsx');
  assert.match(api, /currentUser:[\s\S]*"\/users\/me"/);
  assert.match(serverApi, /currentUser: \(\) => currentUser/);
  assert.match(login, /api\.syncUser\(result\.data\.session\.access_token\)/);
  assert.match(api, /syncUser:[\s\S]*"\/users\/sync"/);
});

test('protected navigation has an in-shell loading boundary and no root force-dynamic', () => {
  assert.match(read('app/(authenticated)/loading.tsx'), /routeLoading/);
  assert.doesNotMatch(read('app/layout.tsx'), /force-dynamic/);
});
