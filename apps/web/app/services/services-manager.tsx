'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, Service } from '../../lib/api';

type ServiceForm = {
  name: string;
  description: string;
  defaultDurationMinutes: string;
  status: Service['status'];
};

const emptyForm: ServiceForm = { name: '', description: '', defaultDurationMinutes: '', status: 'ACTIVE' };

export function ServicesManager() {
  const [items, setItems] = useState<Service[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.services('?page=1&pageSize=100');
      setItems(data.items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load services.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        defaultDurationMinutes: form.defaultDurationMinutes ? Number(form.defaultDurationMinutes) : undefined,
        status: form.status,
      };
      if (editingId) await api.updateService(editingId, payload);
      else await api.createService(payload);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save service.');
    }
  }

  function edit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? '',
      defaultDurationMinutes: service.defaultDurationMinutes?.toString() ?? '',
      status: service.status,
    });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this service?')) return;
    try {
      await api.deleteService(id);
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete service.');
    }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Operations</p><h2>Service catalogue</h2><p>Manage the cleaning services available for templates and work planning.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit service' : 'New service'}</h3></div>
        <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Description<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label>Default duration in minutes<input type="number" min="1" value={form.defaultDurationMinutes} onChange={(event) => setForm({ ...form, defaultDurationMinutes: event.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Service['status'] })}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
        <div className="formActions"><button className="primaryButton">Save service</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Available services</h3></div><div className="dataList">
        {items.map((service) => <article className="dataRow" key={service.id}><div><strong>{service.name}</strong><p>{service.description || 'No description'}{service.defaultDurationMinutes ? ` · ${service.defaultDurationMinutes} minutes` : ''}</p></div><div className="rowActions"><span className="statusPill">{service.status}</span><button onClick={() => edit(service)}>Edit</button><button className="dangerButton" onClick={() => void remove(service.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No services found</strong><p>Add the first cleaning service to the catalogue.</p></div> : null}
      </div></section>
    </div>
  </>;
}
