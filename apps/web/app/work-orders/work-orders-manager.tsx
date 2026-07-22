'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, Customer, Property, WorkOrder } from '../../lib/api';

const emptyForm = { customerId: '', propertyId: '', title: '', description: '', status: 'OPEN' as const, priority: 'NORMAL' as const, scheduledAt: '', completedAt: '' };

export function WorkOrdersManager({ createdById }: { createdById: string }) {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const availableProperties = useMemo(() => properties.filter((p) => !form.customerId || p.customerId === form.customerId), [properties, form.customerId]);

  async function load() {
    try {
      const [workData, customerData, propertyData] = await Promise.all([
        api.workOrders('?page=1&pageSize=100'), api.customers('?page=1&pageSize=100'), api.properties('?page=1&pageSize=100'),
      ]);
      setItems(workData.items); setCustomers(customerData.items); setProperties(propertyData.items);
      setForm((current) => current.customerId || !customerData.items[0] ? current : { ...current, customerId: customerData.items[0].id, propertyId: propertyData.items.find((p) => p.customerId === customerData.items[0].id)?.id ?? '' });
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load work orders.'); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = { ...form, scheduledAt: form.scheduledAt || undefined, completedAt: form.completedAt || undefined };
      if (editingId) await api.updateWorkOrder(editingId, payload);
      else await api.createWorkOrder({ ...payload, createdById });
      setEditingId(null);
      setForm({ ...emptyForm, customerId: customers[0]?.id ?? '', propertyId: properties.find((p) => p.customerId === customers[0]?.id)?.id ?? '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save work order.'); }
  }

  function edit(workOrder: WorkOrder) {
    setEditingId(workOrder.id);
    setForm({ customerId: workOrder.customerId, propertyId: workOrder.propertyId, title: workOrder.title, description: workOrder.description ?? '', status: workOrder.status, priority: workOrder.priority, scheduledAt: workOrder.scheduledAt?.slice(0, 16) ?? '', completedAt: workOrder.completedAt?.slice(0, 16) ?? '' });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this work order?')) return;
    try { await api.deleteWorkOrder(id); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete work order.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Operations</p><h2>Work orders</h2><p>Schedule work and keep status and priority current.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit work order' : 'New work order'}</h3></div>
        <label>Customer<select required value={form.customerId} onChange={(e) => { const customerId = e.target.value; setForm({ ...form, customerId, propertyId: properties.find((p) => p.customerId === customerId)?.id ?? '' }); }}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Property<select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property</option>{availableProperties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Description<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrder['status'] })}>{['DRAFT','OPEN','SCHEDULED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrder['priority'] })}>{['LOW','NORMAL','HIGH','URGENT'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Scheduled at<input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton">Save work order</button>{editingId ? <button type="button" onClick={() => setEditingId(null)}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Work queue</h3></div><div className="dataList">
        {items.map((workOrder) => <article className="dataRow" key={workOrder.id}><div><strong>{workOrder.title}</strong><p>{workOrder.customer.name} · {workOrder.property.name}</p></div><div className="rowActions"><span className="statusPill">{workOrder.status.replaceAll('_', ' ')}</span><span className="priorityText">{workOrder.priority}</span><button onClick={() => edit(workOrder)}>Edit</button><button className="dangerButton" onClick={() => void remove(workOrder.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No work orders found</strong><p>Create a customer and property, then schedule the first job.</p></div> : null}
      </div></section>
    </div>
  </>;
}
