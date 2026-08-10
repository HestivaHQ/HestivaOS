import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AppUser } from '../../lib/api';
import { MobileAppNavigation } from './mobile-app-navigation';
import { AccountMenu } from './account-menu';
import { createAuthenticatedApi } from '../../lib/api-server';

const APP_NAVIGATION_LINKS = [
  ['/', 'Dashboard'],
  ['/customers', 'Customers'],
  ['/properties', 'Properties'],
  ['/work-orders', 'Work orders'],
  ['/technicians', 'Technicians'],
  ['/employees', 'Employee Records'],
  ['/crews', 'Crews'],
  ['/shifts', 'Shift planning'],
  ['/profile', 'My profile'],
] as const;

export async function AppFrame({ active, email, user, children }: { active: string; email: string; user?: AppUser; children: ReactNode }) {
  const authoritativeUser = user ?? await (await createAuthenticatedApi()).syncUser();
  const links = APP_NAVIGATION_LINKS.filter(([href]) => href !== '/employees' || authoritativeUser.role === 'ADMIN');
  return (
    <main className="appShell">
      <MobileAppNavigation active={active} email={email} user={authoritativeUser} links={links} />
      <aside className="sidebar desktopSidebar">
        <div><p className="eyebrow">Hestiva OS</p><h1 className="brand">Operations</h1></div>
        <nav className="navList" aria-label="Primary navigation">
          {links.map(([href, label]) => <Link key={href} className={`navLink ${active === href ? 'active' : ''}`} href={href}>{label}</Link>)}
        </nav>
        <div className="accountBlock"><AccountMenu user={authoritativeUser} email={email} /></div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
