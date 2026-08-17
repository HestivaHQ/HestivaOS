'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, Crew, Technician } from '../../lib/api';

type CrewForm = { name: string; description: string; status: Crew['status']; leaderId: string; memberIds: string[] };
const emptyForm: CrewForm = { name: '', description: '', status: 'ACTIVE', leaderId: '', memberIds: [] };

export function CrewsManager() {
  const [items, setItems] = useState<Crew[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [form, setForm] = useState<CrewForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedMembers = useMemo(() => technicians.filter((technician) => form.memberIds.includes(technician.id)), [form.memberIds, technicians]);

  async function loadCrews() {
    try {
      const query = search.trim() ? `?page=1&pageSize=100&search=${encodeURIComponent(search.trim())}` : '?page=1&pageSize=100';
      setItems((await api.crews(query)).items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load crews.'); }
  }

  async function loadTechnicians() {
    try {
      setTechnicians((await api.technicians('?page=1&pageSize=100')).items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load technicians.'); }
  }

  useEffect(() => { void loadTechnicians(); }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadCrews(); }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  function toggleMember(id: string) {
    const memberIds = form.memberIds.includes(id) ? form.memberIds.filter((memberId) => memberId !== id) : [...form.memberIds, id];
    setForm({ ...form, memberIds, leaderId: memberIds.length === 1 ? memberIds[0] : (memberIds.includes(form.leaderId) ? form.leaderId : '') });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, leaderId: form.leaderId || null };
      if (editingId) await api.updateCrew(editingId, payload);
      else await api.createCrew(payload);
      setForm(emptyForm);
      setEditingId(null);
      await loadCrews();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save crew.'); }
    finally { setBusy(false); }
  }

  function edit(crew: Crew) {
    setEditingId(crew.id);
    setForm({ name: crew.name, description: crew.description ?? '', status: crew.status, leaderId: crew.leaderId ?? '', memberIds: crew.members.map((member) => member.technicianId) });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this crew? Crews assigned to active work orders cannot be deleted.')) return;
    try { await api.deleteCrew(id); await loadCrews(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete crew.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Field operations</p><h2>Crews</h2><p>Create cleaning crews, assign members, and nominate a crew leader.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit crew' : 'New crew'}</h3></div>
        <label>Crew name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Crew['status'] })}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
        <fieldset><legend>Members</legend><div className="dataList">{technicians.map((technician) => <label className="dataRow" key={technician.id}><span><input type="checkbox" checked={form.memberIds.includes(technician.id)} disabled={technician.status === 'INACTIVE' && !form.memberIds.includes(technician.id)} onChange={() => toggleMember(technician.id)} /> {technician.firstName} {technician.lastName}</span><span className="statusPill">{technician.status}</span></label>)}</div></fieldset>
        <label>Crew leader<select value={form.leaderId} onChange={(e) => setForm({ ...form, leaderId: e.target.value })}><option value="">Select leader</option>{selectedMembers.map((technician) => <option key={technician.id} value={technician.id}>{technician.firstName} {technician.lastName}</option>)}</select></label>
        <div className="formActions"><button className="primaryButton" disabled={busy}>{busy ? 'Saving…' : 'Save crew'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Crew list</h3><input className="searchInput" placeholder="Search crews" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="dataList">
        {items.map((crew) => <article className="dataRow" key={crew.id}><div><strong>{crew.name}</strong><p>{crew.leader ? `Leader: ${crew.leader.firstName} ${crew.leader.lastName}` : 'No leader'}</p><p>{crew.members.length} Technician{crew.members.length === 1 ? '' : 's'}</p><p>{crew.members.map((member) => `${member.technician.firstName} ${member.technician.lastName}`).join(' · ') || 'No members assigned'}</p></div><div className="rowActions"><span className="statusPill">{crew.status}</span><button onClick={() => edit(crew)}>Edit crew</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No crews found</strong><p>Create the first cleaning crew using the form.</p></div> : null}
      </div></section>
    </div>
  </>;
}
