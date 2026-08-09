import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AppUser } from '../../lib/api';
import { MobileAppNavigation } from './mobile-app-navigation';
import { SignOutButton } from './sign-out-button';

const APP_NAVIGATION_LINKS = [
  ['/', 'Dashboard'],
  ['/customers', 'Customers'],
  ['/properties', 'Properties'],
  ['/services', 'Services'],
  ['/technicians', 'Technicians'],
  ['/crews', 'Crews'],
  ['/shifts', 'Shift planning'],
  ['/work-orders', 'Work orders'],
  ['/profile', 'My profile'],
] as const;

export function AppFrame({ active, email, user, children }: { active: string; email: string; user?: AppUser; children: ReactNode }) {
  return (
    <main className="appShell">
      <MobileAppNavigation active={active} email={email} user={user} links={APP_NAVIGATION_LINKS} />
      <aside className="sidebar desktopSidebar">
        <div><p className="eyebrow">Hestiva OS</p><h1 className="brand">Operations</h1></div>
        <nav className="navList" aria-label="Primary navigation">
          {APP_NAVIGATION_LINKS.map(([href, label]) => <Link key={href} className={`navLink ${active === href ? 'active' : ''}`} href={href}>{label}</Link>)}
        </nav>
        <div className="accountBlock"><div className="headerProfile">{user?.profilePhotoUrl ? <img className="headerAvatar" src={user.profilePhotoUrl} alt="" /> : <span className="headerAvatar">{(user?.displayName || user?.firstName || email).slice(0, 2).toUpperCase()}</span>}<span><strong>{user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email}</strong><small>{user?.jobTitle || user?.role?.replaceAll('_', ' ') || 'Technician'}</small></span></div><SignOutButton /></div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
