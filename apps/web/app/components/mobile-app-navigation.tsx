'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import type { AppUser } from '../../lib/api';
import { accountInitials } from '../../lib/account-policy';
import { AccountMenu } from './account-menu';

type NavigationLink = readonly [href: string, label: string];

function Avatar({ user, email }: { user?: AppUser; email: string }) {
  return user?.profilePhotoUrl
    ? <img className="headerAvatar" src={user.profilePhotoUrl} alt="" />
    : <span className="headerAvatar">{accountInitials(user, email)}</span>;
}

export function MobileAppNavigation({ active, email, user, links }: {
  active: string;
  email: string;
  user?: AppUser;
  links: readonly NavigationLink[];
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return <>
    <header className="mobileAppHeader">
      <div className="mobileBrand"><span>Hestiva OS</span><strong>Operations</strong></div>
      <div className="mobileHeaderActions">
        <AccountMenu user={user} email={email} compact />
        <button
          className="mobileMenuButton"
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
    </header>

    {open ? <button className="mobileNavBackdrop" type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} /> : null}
    <aside id={menuId} className={`mobileNavDrawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="mobileNavHeading"><strong>Navigation</strong><button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)}>×</button></div>
      <nav className="navList" aria-label="Primary navigation">
        {links.map(([href, label]) => <Link key={href} className={`navLink ${active === href ? 'active' : ''}`} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
      <div className="accountBlock">
        <div className="headerProfile"><Avatar user={user} email={email} /><span><strong>{user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email}</strong><small>{user?.role?.replaceAll('_', ' ') || 'Role unavailable'}</small></span></div>
        <AccountMenu user={user} email={email} />
      </div>
    </aside>
  </>;
}
