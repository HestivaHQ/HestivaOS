'use client';
import { useState } from 'react';
import { api, BusinessListOption, BusinessListType } from '../../../../lib/api';
import { createClient } from '../../../../lib/supabase/client';

const labels: Record<BusinessListType, string> = { JOB_TITLE: 'Job Titles', DEPARTMENT: 'Departments', PROPERTY_TYPE: 'Property Types' };
async function token() { const { data: { session } } = await createClient().auth.getSession(); if (!session) throw new Error('Authenticated session is required.'); return session.access_token; }
export function BusinessListsManager({ initialOptions }: { initialOptions: BusinessListOption[] }) {
  const [options, setOptions] = useState(initialOptions);
  const [type, setType] = useState<BusinessListType>('JOB_TITLE');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  async function add() {
    try { const option = await api.createBusinessListOption(await token(), { type, label }); setOptions([...options, option]); setLabel(''); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to add option.'); }
  }
  async function toggle(option: BusinessListOption) {
    try { const updated = await api.updateBusinessListOption(await token(), option.id, { isActive: !option.isActive }); setOptions(options.map((x) => x.id === option.id ? updated : x)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update option.'); }
  }
  return <>
    <header className="pageHeader"><div><p className="eyebrow">Admin Settings</p><h2>Business Lists</h2><p>Manage Job Titles, Departments, and Property Types used by controlled inputs.</p></div></header>
    {error ? <p className="errorBanner" role="alert">{error}</p> : null}
    <section className="panel"><div className="employeeFields"><label>List<select value={type} onChange={(e) => setType(e.target.value as BusinessListType)}>{Object.entries(labels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><label>New option<input value={label} onChange={(e) => setLabel(e.target.value)} /></label><button type="button" className="primaryButton" disabled={!label.trim()} onClick={() => void add()}>Add option</button></div></section>
    <section className="panel"><h3>{labels[type]}</h3>{options.filter((x) => x.type === type).map((option) => <div className="lookupOption" key={option.id}><span>{option.label} · {option.isActive ? 'Active' : 'Inactive'}</span><button type="button" className="secondaryButton" onClick={() => void toggle(option)}>{option.isActive ? 'Deactivate' : 'Activate'}</button></div>)}</section>
  </>;
}
