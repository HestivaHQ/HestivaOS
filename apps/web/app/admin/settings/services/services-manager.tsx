'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, Service } from '../../../../lib/api';

type ServiceForm = { name: string; description: string; type: Service['type'] };
const emptyForm: ServiceForm = { name: '', description: '', type: 'PRIMARY' };

export function AdminServicesManager({ initialItems = [] }: { initialItems?: Service[] }) {
  const [items, setItems] = useState<Service[]>(initialItems);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const initialSearch = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await api.services(`?page=1&pageSize=100&search=${encodeURIComponent(search)}`);
      setItems(data.items); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load services.'); }
  }, [search]);

  useEffect(() => {
    if (initialSearch.current) { initialSearch.current = false; return; }
    const timer = window.setTimeout(() => void load(), 150);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingId) await api.updateService(editingId, form);
      else await api.createService(form);
      setEditingId(null); setForm(emptyForm); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save service.'); }
  }

  function edit(service: Service) {
    setEditingId(service.id);
    setForm({ name: service.name, description: service.description ?? '', type: service.type });
  }

  async function toggleStatus(service: Service) {
    try {
      await api.updateService(service.id, { status: service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to change service status.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Admin Settings</p><h2>Services</h2><p>Create and maintain the canonical operational service catalogue.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit service' : 'New service'}</h3></div>
        <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Availability<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Service['type'] })}><option value="PRIMARY">Primary service only</option><option value="ADD_ON">Add-on only</option><option value="BOTH">Primary service and add-on</option></select></label>
        <label>Description<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="formActions"><button className="primaryButton">{editingId ? 'Save changes' : 'Create service'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader serviceCatalogueHeader"><h3>Catalogue</h3><label>Search<input className="searchInput" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="dataList">
        {items.map((service) => <article className="dataRow" key={service.id}><div><strong>{service.name}</strong><p>{service.description || 'No operational description'}</p></div><div className="rowActions"><span className="statusPill">{service.type === 'BOTH' ? 'PRIMARY + ADD-ON' : service.type === 'ADD_ON' ? 'ADD-ON' : 'PRIMARY'}</span><span className="statusPill">{service.status}</span><button onClick={() => edit(service)}>Edit</button><button onClick={() => void toggleStatus(service)}>{service.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No services found</strong><p>Try a different search or create a service.</p></div> : null}
      </div></section>
    </div>
  </>;
}
