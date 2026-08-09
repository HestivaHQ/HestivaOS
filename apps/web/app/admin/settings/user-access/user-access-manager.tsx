'use client';

import { useMemo, useState } from 'react';
import { AdminUser, api, UserRole } from '../../../../lib/api';
import { createClient } from '../../../../lib/supabase/client';

const roles: UserRole[] = ['ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER', 'SUPERVISOR', 'TECHNICIAN'];

async function accessToken() {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session is required.');
  return session.access_token;
}

export function UserAccessManager({ initialUsers, currentUserId }: { initialUsers: AdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [managingId, setManagingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>('TECHNICIAN');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const filtered = useMemo(() => users.filter((user) => {
    const name = user.displayName || `${user.firstName} ${user.lastName}`;
    const matchesSearch = `${name} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (roleFilter === 'ALL' || user.role === roleFilter) && (statusFilter === 'ALL' || user.status === statusFilter);
  }), [users, search, roleFilter, statusFilter]);

  function begin(user: AdminUser) { setManagingId(user.id); setDraftRole(user.role); setError(''); setMessage(''); }
  function replace(updated: AdminUser) { setUsers((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); }
  async function saveRole(user: AdminUser) {
    if (draftRole === user.role) return;
    if (user.role === 'ADMIN' && draftRole !== 'ADMIN' && !window.confirm('Remove this user’s administrator role? This changes their application permissions immediately.')) return;
    setSavingId(user.id); setError(''); setMessage('');
    try { replace(await api.updateUserRole(await accessToken(), user.id, draftRole)); setMessage('Application role updated.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update role.'); }
    finally { setSavingId(null); }
  }
  async function toggleAccess(user: AdminUser) {
    const disabling = user.status === 'ACTIVE';
    if (disabling && !window.confirm(`Disable Hestiva OS access for ${user.displayName || user.email}? They will be blocked on their next application request.`)) return;
    setSavingId(user.id); setError(''); setMessage('');
    try { replace(await api.updateUserAccess(await accessToken(), user.id, disabling ? 'INACTIVE' : 'ACTIVE')); setMessage(disabling ? 'OS access disabled.' : 'OS access enabled.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update OS access.'); }
    finally { setSavingId(null); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Admin Settings</p><h2>User Access</h2><p>Manage application roles and permission to sign in to Hestiva OS.</p></div></header>
    {error ? <p className="errorBanner" role="alert">{error}</p> : null}
    {message ? <p className="successBanner" role="status">{message}</p> : null}
    <section className="panel userAccessPanel" aria-label="Hestiva OS users">
      <div className="userAccessFilters">
        <label><span>Search users</span><input className="searchInput" type="search" placeholder="Search by name or email" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label><span>Role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="ALL">All roles</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <label><span>OS access</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Disabled</option></select></label>
      </div>
      <div className="userAccessList">
        {filtered.map((user) => {
          const name = user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email;
          const managing = managingId === user.id;
          return <article className="userAccessCard" key={user.id}>
            <div className="userIdentity"><strong>{name}{user.id === currentUserId ? ' (you)' : ''}</strong><a href={`mailto:${user.email}`}>{user.email}</a></div>
            <dl><div><dt>Role</dt><dd>{user.role}</dd></div><div><dt>OS access</dt><dd><span className={`accessBadge ${user.status.toLowerCase()}`}>{user.status === 'ACTIVE' ? 'Active' : 'Disabled'}</span></dd></div><div><dt>Last login/activity</dt><dd>Not available</dd></div></dl>
            <button className="manageButton" type="button" aria-expanded={managing} onClick={() => managing ? setManagingId(null) : begin(user)}>{managing ? 'Close' : 'Manage'}</button>
            {managing ? <div className="manageUserPanel">
              <label>Application role<select value={draftRole} disabled={savingId === user.id} onChange={(event) => setDraftRole(event.target.value as UserRole)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
              <div className="formActions"><button className="primaryButton" type="button" disabled={savingId === user.id || draftRole === user.role} onClick={() => void saveRole(user)}>{savingId === user.id ? 'Saving…' : 'Save role'}</button></div>
              <div className="accessAction"><strong>OS access</strong><p>{user.status === 'ACTIVE' ? 'This user can access Hestiva OS.' : 'This user is blocked from Hestiva OS.'}</p><button className={user.status === 'ACTIVE' ? 'dangerButton' : 'primaryButton'} type="button" disabled={savingId === user.id} onClick={() => void toggleAccess(user)}>{user.status === 'ACTIVE' ? 'Disable access' : 'Enable access'}</button></div>
            </div> : null}
          </article>;
        })}
        {!filtered.length ? <p className="emptyState"><strong>No users found.</strong>Try a different search or filter.</p> : null}
      </div>
    </section>
  </>;
}
