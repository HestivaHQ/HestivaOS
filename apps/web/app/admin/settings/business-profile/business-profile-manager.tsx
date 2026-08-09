'use client';

import { FormEvent, useMemo, useState } from 'react';
import { BusinessProfile, api } from '../../../../lib/api';
import { businessProfileCompleteness, formatBusinessProfile } from '../../../../lib/business-profile';
import { createClient } from '../../../../lib/supabase/client';

type TextField = Exclude<keyof BusinessProfile, `share${string}`>;
type ShareField = Extract<keyof BusinessProfile, `share${string}`>;
type Field = { key: TextField; label: string; type?: 'email' | 'url' | 'textarea'; autoComplete?: string };
const sections: Array<{ title: string; description: string; fields: Field[] }> = [
  { title: 'General Business Information', description: 'Official company and customer-facing contact information.', fields: [
    { key: 'registeredName', label: 'Registered / legal business name', autoComplete: 'organization' }, { key: 'tradingName', label: 'Trading name' },
    { key: 'registrationNumber', label: 'Company registration number' }, { key: 'contactNumber', label: 'Main contact number', autoComplete: 'tel' },
    { key: 'businessEmail', label: 'Business email', type: 'email', autoComplete: 'email' }, { key: 'website', label: 'Website', type: 'url', autoComplete: 'url' },
    { key: 'businessAddress', label: 'Business address', type: 'textarea', autoComplete: 'street-address' },
  ] },
  { title: 'Banking & Payment Information', description: 'Controlled payment details. Never enter banking credentials, PINs or OTPs.', fields: [
    { key: 'bankName', label: 'Bank name' }, { key: 'accountHolder', label: 'Account holder' }, { key: 'accountNumber', label: 'Account number' },
    { key: 'accountType', label: 'Account type' }, { key: 'branchCode', label: 'Branch code' }, { key: 'paymentInstructions', label: 'Payment reference / instructions', type: 'textarea' },
  ] },
  { title: 'Compliance & Official Information', description: 'Only enter verified official identifiers. Do not enter secrets or credentials.', fields: [
    { key: 'taxNumber', label: 'Tax number' }, { key: 'vatNumber', label: 'VAT number' }, { key: 'officialIdentifiers', label: 'Other official registration / compliance identifiers', type: 'textarea' },
  ] },
];
function shareKey(key: TextField): ShareField { return `share${key[0].toUpperCase()}${key.slice(1)}` as ShareField; }
async function accessToken() { const { data: { session } } = await createClient().auth.getSession(); if (!session?.access_token) throw new Error('Authenticated session is required.'); return session.access_token; }

export function BusinessProfileManager({ initialProfile }: { initialProfile: BusinessProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const formatted = useMemo(() => formatBusinessProfile(profile), [profile]);
  const completeness = businessProfileCompleteness(profile);
  function setText(key: TextField, value: string) { setProfile((current) => ({ ...current, [key]: value })); }
  function toggle(key: TextField) { const field = shareKey(key); setProfile((current) => ({ ...current, [field]: !current[field] })); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError(''); setMessage('');
    try { setProfile(await api.updateBusinessProfile(await accessToken(), profile)); setMessage('Business Profile saved.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save the Business Profile.'); }
    finally { setSaving(false); }
  }
  function ensureSelected() { if (formatted === 'Hestiva Business Information') { setError('Select at least one non-empty field before sharing.'); return false; } setError(''); return true; }
  function shareWhatsApp() { if (ensureSelected()) window.open(`https://wa.me/?text=${encodeURIComponent(formatted)}`, '_blank', 'noopener,noreferrer'); }
  function shareEmail() { if (ensureSelected()) window.location.href = `mailto:?subject=${encodeURIComponent('Hestiva Business Information')}&body=${encodeURIComponent(formatted)}`; }
  async function copy() {
    if (!ensureSelected()) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(formatted);
      else { const area = document.createElement('textarea'); area.value = formatted; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); const copied = document.execCommand('copy'); area.remove(); if (!copied) throw new Error(); }
      setMessage('Selected business details copied to the clipboard.');
    } catch { setError('Copy was unavailable. Select the details manually and try again.'); }
  }
  return <>
    <header className="pageHeader"><div><p className="eyebrow">Admin Settings</p><h2>Business Profile</h2><p>The canonical source for Hestiva business information.</p></div><div className="completeness" aria-label={`Business profile ${completeness}% complete`}><strong>{completeness}%</strong><span>complete</span></div></header>
    {error ? <p className="errorBanner" role="alert">{error}</p> : null}{message ? <p className="successBanner" role="status">{message}</p> : null}
    <form className="businessProfileForm" onSubmit={save}>
      {sections.map((section) => <section className="panel businessProfileSection" key={section.title}><div className="sectionHeading"><h3>{section.title}</h3><p>{section.description}</p></div><div className="businessFieldGrid">{section.fields.map((field) => <div className="businessField" key={field.key}><label htmlFor={field.key}>{field.label}</label>{field.type === 'textarea' ? <textarea id={field.key} rows={3} value={profile[field.key] ?? ''} onChange={(event) => setText(field.key, event.target.value)} /> : <input id={field.key} type={field.type ?? 'text'} autoComplete={field.autoComplete} value={profile[field.key] ?? ''} onChange={(event) => setText(field.key, event.target.value)} />}<label className="shareToggle"><input type="checkbox" checked={profile[shareKey(field.key)]} onChange={() => toggle(field.key)} /><span>Include when sharing</span></label></div>)}</div></section>)}
      <div className="saveProfileBar"><p>Share selections are saved with the profile. General details default on; banking and compliance default off.</p><button className="primaryButton" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
    </form>
    <section className="panel shareActions" aria-labelledby="share-heading"><div><h3 id="share-heading">Share selected details</h3><p>Only selected, non-empty fields are included. Save changes first to remember new selections.</p></div><div className="shareButtonGrid"><button type="button" onClick={shareWhatsApp}>Share via WhatsApp</button><button type="button" onClick={shareEmail}>Share via Email</button><button className="primaryButton" type="button" onClick={() => void copy()}>Copy selected details</button></div></section>
  </>;
}
