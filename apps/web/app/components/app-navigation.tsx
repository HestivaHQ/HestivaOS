'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

export type NavigationItem =
  | { readonly href: string; readonly label: string }
  | { readonly label: string; readonly children: readonly { readonly href: string; readonly label: string }[] };

export function AppNavigation({ active, items, onNavigate }: { active: string; items: readonly NavigationItem[]; onNavigate?: () => void }) {
  const group = items.find((item): item is Extract<NavigationItem, { children: readonly unknown[] }> => 'children' in item);
  const childActive = group?.children.some((child) => child.href === active) ?? false;
  const [groupOpen, setGroupOpen] = useState(childActive);
  const submenuId = useId();
  useEffect(() => { if (childActive) setGroupOpen(true); }, [childActive]);

  return <nav className="navList" aria-label="Primary navigation">
    {items.map((item) => 'href' in item
      ? <Link key={item.href} className={`navLink ${active === item.href ? 'active' : ''}`} href={item.href} onClick={onNavigate}>{item.label}</Link>
      : <div className="navGroup" key={item.label}>
          <button className={`navLink navDisclosure ${childActive ? 'active' : ''}`} type="button" aria-expanded={groupOpen} aria-controls={submenuId} onClick={() => setGroupOpen((value) => !value)}><span>{item.label}</span><span aria-hidden="true">{groupOpen ? '−' : '+'}</span></button>
          {groupOpen ? <div className="navSubmenu" id={submenuId}>{item.children.map((child) => <Link key={child.href} className={`navLink ${active === child.href ? 'active' : ''}`} href={child.href} onClick={onNavigate}>{child.label}</Link>)}</div> : null}
        </div>)}
  </nav>;
}
