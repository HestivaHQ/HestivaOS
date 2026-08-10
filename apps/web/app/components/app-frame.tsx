import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AppUser } from '../../lib/api';
import { MobileAppNavigation } from './mobile-app-navigation';
import { AccountMenu } from './account-menu';

const APP_NAVIGATION_LINKS = [
  ['/', 'Dashboard'],
  ['/customers', 'Customers'],
  ['/properties', 'Properties'],
  ['/services', 'Services'],
  ['/technicians', 'Technicians'],
  ['/employees', 'Employee Records'],
  ['/crews', 'Crews'],
  ['/shifts', 'Shift planning'],
  ['/work-orders', 'Work orders'],
  ['/profile', 'My profile'],
] as const;

export function AppFrame({ active, email, user, children }: { active: string; email: string; user?: AppUser; children: ReactNode }) {
  return (
    <main className="appShell">
      <MobileAppNavigation active={active} email={email} user={user} links={APP_NAVIGATION_LINKS.filter(([href]) => href !== '/employees' || user?.role === 'ADMIN')} />
      <aside className="sidebar desktopSidebar">
        <div><p className="eyebrow">Hestiva OS</p><h1 className="brand">Operations</h1></div>
        <nav className="navList" aria-label="Primary navigation">
          {APP_NAVIGATION_LINKS.filter(([href]) => href !== '/employees' || user?.role === 'ADMIN').map(([href, label]) => <Link key={href} className={`navLink ${active === href ? 'active' : ''}`} href={href}>{label}</Link>)}
        </nav>
        <div className="accountBlock"><AccountMenu user={user} email={email} /></div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
