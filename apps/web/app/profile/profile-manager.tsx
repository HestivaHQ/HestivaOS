'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { api, AppUser } from '../../lib/api';
import { createClient } from '../../lib/supabase/client';

export function profileInitials(user: AppUser) {
  return (user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email)
    .split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function ProfileManager({ user, authenticatedEmail }: { user: AppUser; authenticatedEmail: string }) {
  const [profile, setProfile] = useState(user);
  const [saving, setSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session?.access_token) throw new Error('Authenticated session is required.');
    return session.access_token;
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError(''); setMessage('');
    try {
      if (!profile.firstName.trim() || !profile.lastName.trim()) throw new Error('First name and last name are required.');
      const updated = await api.updateProfile(await token(), { firstName: profile.firstName, lastName: profile.lastName, displayName: profile.displayName, phoneNumber: profile.phoneNumber, profilePhotoUrl: profile.profilePhotoUrl });
      setProfile(updated); setMessage('Personal information saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save profile.'); } finally { setSaving(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const supabase = createClient(); const bucket = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET || 'profile-images';
      const path = `${profile.authUserId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const updated = await api.updateProfile(await token(), { profilePhotoUrl: data.publicUrl }); setProfile(updated); setMessage('Profile photo updated.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload profile photo.'); } finally { setSaving(false); }
  }
  async function removePhoto() {
    if (saving) return; setSaving(true); setError(''); setMessage('');
    try { const updated = await api.updateProfile(await token(), { profilePhotoUrl: null }); setProfile(updated); setMessage('Profile photo removed.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to remove profile photo.'); } finally { setSaving(false); }
  }
  async function changePassword(event: FormEvent) {
    event.preventDefault(); if (securitySaving) return; setError(''); setMessage('');
    if (password.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (password !== confirmation) { setError('New password and confirmation do not match.'); return; }
    setSecuritySaving(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(''); setConfirmation(''); setMessage('Password updated securely.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update password.'); } finally { setSecuritySaving(false); }
  }
  return <>
    <header className="pageHeader"><div><p className="eyebrow">Account</p><h2>My Profile</h2><p>Manage your personal account information and security.</p></div></header>
    {error ? <p className="errorBanner" role="alert">{error}</p> : null}{message ? <p className="successBanner" role="status">{message}</p> : null}
    <form className="panel resourceForm profileSection" onSubmit={save}>
      <div><h3>Personal information</h3><p>Your email is controlled by your authenticated Supabase account.</p></div>
      <div className="profileAvatar">{profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="Profile" /> : profileInitials(profile)}</div>
      <label>Profile photo<input type="file" accept="image/*" onChange={upload} disabled={saving} /></label>
      {profile.profilePhotoUrl ? <button type="button" onClick={() => void removePhoto()} disabled={saving}>Remove photo</button> : null}
      <label>First name<input required value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></label>
      <label>Last name<input required value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></label>
      <label>Display name<input value={profile.displayName ?? ''} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label>
      <label>Phone number<input type="tel" value={profile.phoneNumber ?? ''} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} /></label>
      <label>Email<input type="email" value={authenticatedEmail} readOnly aria-describedby="email-help" /></label>
      <small id="email-help">Email changes require a verified authentication flow and are not available here yet.</small>
      <div className="formActions"><button className="primaryButton" disabled={saving}>{saving ? 'Saving…' : 'Save personal information'}</button></div>
    </form>
    <form className="panel resourceForm profileSection" onSubmit={changePassword}>
      <div><h3>Security</h3><p>Change the password managed by Supabase Auth.</p></div>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={securitySaving} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={securitySaving} /></label>
      <div className="formActions"><button className="primaryButton" disabled={securitySaving}>{securitySaving ? 'Updating…' : 'Change password'}</button></div>
    </form>
  </>;
}
