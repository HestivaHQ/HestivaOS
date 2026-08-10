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
  { href: '/work-orders', label: 'Work orders' },
  { label: 'Team', children: [
    { href: '/technicians', label: 'Technicians' },
    { href: '/crews', label: 'Crews' },
    { href: '/shifts', label: 'Shift Planning' },
  ] },
  { href: '/profile', label: 'My profile' },
] as const satisfies readonly NavigationItem[];

export async function AppFrame({ active, email, user, children }: { active: string; email: string; user?: AppUser; children: ReactNode }) {
  const authoritativeUser = user ?? await (await createAuthenticatedApi()).syncUser();
  return (
    <main className="appShell">
      <MobileAppNavigation active={active} email={email} user={authoritativeUser} items={APP_NAVIGATION_ITEMS} />
      <aside className="sidebar desktopSidebar">
        <div><p className="eyebrow">Hestiva OS</p><h1 className="brand">Operations</h1></div>
        <AppNavigation active={active} items={APP_NAVIGATION_ITEMS} />
        <div className="accountBlock"><AccountMenu user={authoritativeUser} email={email} /></div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
