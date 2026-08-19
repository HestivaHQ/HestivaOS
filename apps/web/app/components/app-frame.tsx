import type { ReactNode } from 'react';
import type { AppUser } from '../../lib/api';
import { MobileAppNavigation } from './mobile-app-navigation';
import { AccountMenu } from './account-menu';
import { createAuthenticatedApi } from '../../lib/api-server';
import { AppNavigation, type NavigationItem } from './app-navigation';

export const APP_NAVIGATION_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/properties', label: 'Properties' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/work-orders', label: 'Work orders' },
  { href: '/recurring-services', label: 'Recurring services' },
  { label: 'Team', children: [
    { href: '/technicians', label: 'Technicians' },
    { href: '/crews', label: 'Crews' },
    { href: '/shifts', label: 'Shift Planning' },
  ] },
  { href: '/profile', label: 'My profile' },
] as const satisfies readonly NavigationItem[];

export async function AppFrame({ active, email, user, children }: { active: string; email: string; user?: AppUser; children: ReactNode }) {
  const authoritativeUser = user ?? await (await createAuthenticatedApi()).syncUser();
  const roleItems = authoritativeUser.role === 'SUPERVISOR'
    ? [APP_NAVIGATION_ITEMS[0], { href: '/supervisor/operations', label: 'Operational review' }, ...APP_NAVIGATION_ITEMS.slice(1)]
    : APP_NAVIGATION_ITEMS;
  const navigationItems = authoritativeUser.role === 'ADMIN' ? roleItems : roleItems.filter((item) => !('href' in item) || item.href !== '/quotes');
  return (
    <main className="appShell">
      <MobileAppNavigation active={active} email={email} user={authoritativeUser} items={navigationItems} />
      <aside className="sidebar desktopSidebar">
        <div><p className="eyebrow">Hestiva OS</p><h1 className="brand">Operations</h1></div>
        <AppNavigation active={active} items={navigationItems} />
        <div className="accountBlock"><AccountMenu user={authoritativeUser} email={email} /></div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
