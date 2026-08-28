'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { api, AppUser } from '../../lib/api';
import { preflightEmailChange } from '../../lib/email-change-api';
import { createClient } from '../../lib/supabase/client';
import { ProfilePhotoCropper } from './profile-photo-cropper';

const PROFILE_SOURCE_LIMIT = 20 * 1024 * 1024;
const PROFILE_SOURCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function profileInitials(user: AppUser) {
  return (user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email)
    .split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function storedProfilePhotoPath(publicUrl: string | null | undefined, bucket: string) {
  if (!publicUrl) return null;
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const pathname = new URL(publicUrl).pathname;
    const markerIndex = pathname.indexOf(marker);
    return markerIndex >= 0 ? decodeURIComponent(pathname.slice(markerIndex + marker.length)) : null;
  } catch {
    return null;
  }
}

export function ProfileManager({ user, authenticatedEmail }: { user: AppUser; authenticatedEmail: string }) {
  const [profile, setProfile] = useState(user);
  const [saving, setSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [newEmail, setNewEmail] = useState(authenticatedEmail);
  const [cropFile, setCropFile] = useState<File | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('email-change') === 'confirmed') {
      setMessage('Email confirmation processed. If the confirmed email shown above has changed, the update is complete. Otherwise, Secure Email Change may still require confirmation from the other address.');
    }
  }, []);

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
  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || saving) return;
    setError(''); setMessage('');
    if (!PROFILE_SOURCE_TYPES.has(file.type)) {
      setError('Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > PROFILE_SOURCE_LIMIT) {
      setError('Choose an image smaller than 20 MB.');
      return;
    }
    setCropFile(file);
  }
  async function uploadCroppedPhoto(blob: Blob) {
    if (saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token || !session.user?.id) throw new Error('Authenticated session is required.');
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET || 'profile-images';
      const path = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const updated = await api.updateProfile(session.access_token, { profilePhotoUrl: publicUrl });
      setProfile(updated); setCropFile(null); setMessage('Profile photo updated.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload profile photo.'); throw err; } finally { setSaving(false); }
  }
  async function removePhoto() {
    if (saving) return; setSaving(true); setError(''); setMessage('');
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token || !session.user?.id) throw new Error('Authenticated session is required.');
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET || 'profile-images';
      const oldPath = storedProfilePhotoPath(profile.profilePhotoUrl, bucket);
      const updated = await api.updateProfile(session.access_token, { profilePhotoUrl: null });
      setProfile(updated);
      if (oldPath) {
        const { error: removeError } = await supabase.storage.from(bucket).remove([oldPath]);
        if (removeError) {
          setError('Profile photo was removed from your account, but the stored image could not be cleaned up.');
          return;
        }
      }
      setMessage('Profile photo removed.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to remove profile photo.'); } finally { setSaving(false); }
  }
  async function changeEmail(event: FormEvent) {
    event.preventDefault(); if (emailSaving) return; setError(''); setMessage(''); setEmailSaving(true);
    try {
      const accessToken = await token();
      const email = await preflightEmailChange(accessToken, newEmail);
      const redirectTo = `${window.location.origin}/profile?email-change=confirmed`;
      const { error: updateError } = await createClient().auth.updateUser({ email }, { emailRedirectTo: redirectTo });
      if (updateError) throw updateError;
      setNewEmail(email);
      setMessage('Email change requested. Follow the confirmation instructions sent by Supabase. Secure Email Change may require confirmation from both your current and new addresses.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to request an email change.'); } finally { setEmailSaving(false); }
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
      <div><h3>Personal information</h3><p>Your confirmed email is controlled by your authenticated Supabase account.</p></div>
      <div className="profileAvatar">{profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="Profile" /> : profileInitials(profile)}</div>
      <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={saving} /></label>
      {profile.profilePhotoUrl ? <button type="button" onClick={() => void removePhoto()} disabled={saving}>Remove photo</button> : null}
      <label>First name<input required value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></label>
      <label>Last name<input required value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></label>
      <label>Display name<input value={profile.displayName ?? ''} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label>
      <label>Phone number<input type="tel" value={profile.phoneNumber ?? ''} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} /></label>
      <label>Confirmed email<input type="email" value={authenticatedEmail} readOnly /></label>
      <div className="formActions"><button className="primaryButton" disabled={saving}>{saving ? 'Saving…' : 'Save personal information'}</button></div>
    </form>
    <form className="panel resourceForm profileSection" onSubmit={changeEmail}>
      <div><h3>Change email</h3><p>Your HestivaOS account keeps the same identity. The application email changes only after Supabase confirms the new authenticated email.</p></div>
      <label>New email<input type="email" required autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={emailSaving} /></label>
      <small>Known HestivaOS account conflicts are checked before Supabase sends confirmation. Final synchronization remains fail-closed if the address becomes conflicting later.</small>
      <div className="formActions"><button className="primaryButton" disabled={emailSaving}>{emailSaving ? 'Requesting…' : 'Request email change'}</button></div>
    </form>
    <form className="panel resourceForm profileSection" onSubmit={changePassword}>
      <div><h3>Security</h3><p>Change the password managed by Supabase Auth.</p></div>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={securitySaving} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={securitySaving} /></label>
      <div className="formActions"><button className="primaryButton" disabled={securitySaving}>{securitySaving ? 'Updating…' : 'Change password'}</button></div>
    </form>
    {cropFile ? <ProfilePhotoCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={uploadCroppedPhoto} /> : null}
  </>;
}
