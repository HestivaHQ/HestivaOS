'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, Technician } from '../../lib/api';

type TechnicianForm = { firstName: string; lastName: string; email: string; phone: string; skills: string; notes: string; status: Technician['status'] };
const emptyForm: TechnicianForm = { firstName: '', lastName: '', email: '', phone: '', skills: '', notes: '', status: 'ACTIVE' };

export function TechniciansManager({ initialItems = [] }: { initialItems?: Technician[] }) {
  const [items, setItems] = useState<Technician[]>(initialItems);
  const [form, setForm] = useState<TechnicianForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const initialSearch = useRef(true);

  async function load() {
    try {
      const query = search.trim() ? `?page=1&pageSize=100&search=${encodeURIComponent(search.trim())}` : '?page=1&pageSize=100';
      setItems((await api.technicians(query)).items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load technicians.'); }
  }

  useEffect(() => {
    if (initialSearch.current) { initialSearch.current = false; return; }
    const timeout = window.setTimeout(() => { void load(); }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean) };
      if (editingId) await api.updateTechnician(editingId, payload);
      else await api.createTechnician(payload);
      setForm(emptyForm); setEditingId(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save technician.'); }
    finally { setBusy(false); }
  }

  function edit(technician: Technician) {
    setEditingId(technician.id);
    setForm({ firstName: technician.firstName, lastName: technician.lastName, email: technician.email ?? '', phone: technician.phone ?? '', skills: technician.skills.join(', '), notes: technician.notes ?? '', status: technician.status });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this technician? Existing work orders will become unassigned.')) return;
    try { await api.deleteTechnician(id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete technician.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Field team</p><h2>Technicians</h2><p>Manage contact details, availability, and specialist skills.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit technician' : 'New technician'}</h3></div>
        <label>First name<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
        <label>Last name<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Skills<input placeholder="Electrical, plumbing, HVAC" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Technician['status'] })}><option>ACTIVE</option><option>INACTIVE</option></select></label>
        <label>Notes<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton" disabled={busy}>{busy ? 'Saving…' : 'Save technician'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Technician list</h3><input className="searchInput" placeholder="Search technicians" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="dataList">
        {items.map((technician) => <article className="dataRow" key={technician.id}><div><strong>{technician.firstName} {technician.lastName}</strong><p>{technician.skills.length ? technician.skills.join(' · ') : 'No skills listed'} · {technician.email || technician.phone || 'No contact details'}</p></div><div className="rowActions"><span className="statusPill">{technician.status}</span><button onClick={() => edit(technician)}>Edit</button><button className="dangerButton" onClick={() => void remove(technician.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No technicians found</strong><p>Add the first field technician using the form.</p></div> : null}
      </div></section>
    </div>
  </>;
}
