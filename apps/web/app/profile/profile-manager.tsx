'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { api, AppUser, UserRole } from '../../lib/api';
import { createClient } from '../../lib/supabase/client';

const roles: UserRole[] = ['ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER', 'SUPERVISOR', 'TECHNICIAN'];
const initials = (user: AppUser) => (user.displayName || `${user.firstName} ${user.lastName}` || user.email).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export function ProfileManager({ user }: { user: AppUser }) {
  const [profile, setProfile] = useState(user);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isAdmin = profile.role === 'ADMIN';
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      if (![profile.firstName, profile.lastName, profile.displayName, profile.phoneNumber, profile.jobTitle, profile.department].every((value) => value?.trim())) throw new Error('First name, last name, display name, phone number, job title, and department are required.');
      const { data: { session } } = await createClient().auth.getSession(); if (!session?.access_token) throw new Error('Authenticated session is required.');
      const updated = await api.updateProfile(session.access_token, { firstName: profile.firstName, lastName: profile.lastName, displayName: profile.displayName, phoneNumber: profile.phoneNumber, jobTitle: profile.jobTitle, department: profile.department, profilePhotoUrl: profile.profilePhotoUrl });
      setProfile(updated); setMessage('Profile saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save profile.'); } finally { setSaving(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setSaving(true); setError('');
    try {
      const supabase = createClient(); const bucket = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET || 'profile-images';
      const path = `${profile.authUserId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error('Authenticated session is required.');
      const updated = await api.updateProfile(session.access_token, { profilePhotoUrl: data.publicUrl }); setProfile(updated); setMessage('Profile photo updated.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload profile photo.'); } finally { setSaving(false); }
  }
  async function removePhoto() { setSaving(true); try { const { data: { session } } = await createClient().auth.getSession(); if (!session?.access_token) throw new Error('Authenticated session is required.'); const updated = await api.updateProfile(session.access_token, { profilePhotoUrl: null }); setProfile(updated); setMessage('Profile photo removed.'); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to remove profile photo.'); } finally { setSaving(false); } }
  return <><header className="pageHeader"><div><p className="eyebrow">Account</p><h2>My profile</h2><p>Keep your contact details and profile photo current.</p></div></header>{error ? <p className="errorBanner">{error}</p> : null}{message ? <p className="successBanner">{message}</p> : null}<form className="panel resourceForm" onSubmit={save}><div className="profileAvatar">{profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="Profile" /> : initials(profile)}</div><label>Profile photo<input type="file" accept="image/*" onChange={upload} disabled={saving} /></label>{profile.profilePhotoUrl ? <button type="button" onClick={() => void removePhoto()} disabled={saving}>Remove photo</button> : null}<label>First name<input required value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></label><label>Last name<input required value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></label><label>Display name<input required value={profile.displayName ?? ''} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label><label>Phone number<input required value={profile.phoneNumber ?? ''} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} /></label><label>Job title<input required value={profile.jobTitle ?? ''} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} /></label><label>Department<input required value={profile.department ?? ''} onChange={(e) => setProfile({ ...profile, department: e.target.value })} /></label>{isAdmin ? <label>Role<select value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value as UserRole })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label> : <p>Role: {profile.role.replaceAll('_', ' ')}</p>}<div className="formActions"><button className="primaryButton" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div></form></>;
}
