'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { AppUser } from '../../lib/api';
import { accountInitials, canSeeAdminSettings } from '../../lib/account-policy';
import { SignOutButton } from './sign-out-button';

export function AccountMenu({ user, email, compact = false }: { user?: AppUser; email: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', close); document.addEventListener('mousedown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('mousedown', close); };
  }, [open]);
  return <div className={`accountMenu ${compact ? 'compact' : ''}`} ref={container}>
    <button className="accountMenuTrigger" type="button" aria-expanded={open} aria-controls={menuId} aria-label="Open account menu" onClick={() => setOpen((value) => !value)}>
      {user?.profilePhotoUrl ? <img className="headerAvatar" src={user.profilePhotoUrl} alt="" /> : <span className="headerAvatar">{accountInitials(user, email)}</span>}
      {!compact ? <span><strong>{user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email}</strong><small>{user?.role?.replaceAll('_', ' ') || 'Role unavailable'}</small></span> : null}
    </button>
    {open ? <div className="accountMenuPopover" id={menuId} role="menu">
      <Link href="/profile" role="menuitem" onClick={() => setOpen(false)}>My Profile</Link>
      {canSeeAdminSettings(user) ? <Link href="/admin/settings" role="menuitem" onClick={() => setOpen(false)}>Admin Settings</Link> : null}
      <SignOutButton />
    </div> : null}
  </div>;
}
