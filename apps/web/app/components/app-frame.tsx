import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignOutButton } from './sign-out-button';

export function AppFrame({ active, email, children }: { active: string; email: string; children: ReactNode }) {
  const links = [
    ['/', 'Dashboard'],
    ['/customers', 'Customers'],
    ['/properties', 'Properties'],
    ['/technicians', 'Technicians'],
    ['/work-orders', 'Work orders'],
  ];

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div><p className="eyebrow">Maintenance Marshall</p><h1 className="brand">Operations</h1></div>
        <nav className="navList" aria-label="Primary navigation">
          {links.map(([href, label]) => <Link key={href} className={`navLink ${active === href ? 'active' : ''}`} href={href}>{label}</Link>)}
        </nav>
        <div className="accountBlock"><span>{email}</span><SignOutButton /></div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
