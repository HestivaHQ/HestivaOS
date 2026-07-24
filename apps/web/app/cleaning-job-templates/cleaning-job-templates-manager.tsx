'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, CleaningJobTemplate, Service } from '../../lib/api';

type TemplateForm = { name: string; description: string; estimatedDurationMinutes: string; status: CleaningJobTemplate['status']; serviceIds: string[] };
const emptyForm: TemplateForm = { name: '', description: '', estimatedDurationMinutes: '', status: 'ACTIVE', serviceIds: [] };

export function CleaningJobTemplatesManager() {
  const [items, setItems] = useState<CleaningJobTemplate[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [templateData, serviceData] = await Promise.all([
        api.cleaningJobTemplates('?page=1&pageSize=100'),
        api.services('?page=1&pageSize=100'),
      ]);
      setItems(templateData.items);
      setServices(serviceData.items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load cleaning job templates.'); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        estimatedDurationMinutes: form.estimatedDurationMinutes ? Number(form.estimatedDurationMinutes) : undefined,
        status: form.status,
        serviceIds: form.serviceIds,
      };
      if (editingId) await api.updateCleaningJobTemplate(editingId, payload);
      else await api.createCleaningJobTemplate(payload);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save cleaning job template.'); }
  }

  function edit(template: CleaningJobTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      description: template.description ?? '',
      estimatedDurationMinutes: template.estimatedDurationMinutes?.toString() ?? '',
      status: template.status,
      serviceIds: template.services.map((service) => service.id),
    });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this cleaning job template?')) return;
    try { await api.deleteCleaningJobTemplate(id); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete cleaning job template.'); }
  }

  function toggleService(serviceId: string) {
    setForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId) ? current.serviceIds.filter((id) => id !== serviceId) : [...current.serviceIds, serviceId],
    }));
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Cleaning operations</p><h2>Cleaning job templates</h2><p>Create reusable cleaning job definitions linked to the service catalogue.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit template' : 'New template'}</h3></div>
        <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Description<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label>Estimated duration (minutes)<input min="1" type="number" value={form.estimatedDurationMinutes} onChange={(event) => setForm({ ...form, estimatedDurationMinutes: event.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CleaningJobTemplate['status'] })}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
        <fieldset><legend>Services</legend>{services.map((service) => <label key={service.id}><input type="checkbox" checked={form.serviceIds.includes(service.id)} disabled={service.status === 'INACTIVE' && !form.serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} /> {service.name}{service.status === 'INACTIVE' ? ' (inactive)' : ''}</label>)}</fieldset>
        <div className="formActions"><button className="primaryButton">Save template</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Templates</h3></div><div className="dataList">
        {items.map((template) => <article className="dataRow" key={template.id}><div><strong>{template.name}</strong><p>{template.description || 'No description'} · {template.estimatedDurationMinutes ? `${template.estimatedDurationMinutes} minutes` : 'No duration'} · {template.services.map((service) => service.name).join(', ') || 'No services'}</p></div><div className="rowActions"><span className="statusPill">{template.status}</span><button onClick={() => edit(template)}>Edit</button><button className="dangerButton" onClick={() => void remove(template.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No cleaning job templates</strong><p>Create the first reusable cleaning job template.</p></div> : null}
      </div></section>
    </div>
  </>;
}