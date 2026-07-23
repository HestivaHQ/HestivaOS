'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Customer, Property, Technician, WorkOrder, WorkOrderActivity, WorkOrderStatus } from '../../lib/api';

type WorkOrderForm = { customerId: string; propertyId: string; technicianId: string; title: string; description: string; status: WorkOrder['status']; priority: WorkOrder['priority']; scheduledAt: string; completedAt: string };
const emptyForm: WorkOrderForm = { customerId: '', propertyId: '', technicianId: '', title: '', description: '', status: 'NEW', priority: 'NORMAL', scheduledAt: '', completedAt: '' };
const NEXT_STATUSES: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  NEW: ['ASSIGNED', 'CANCELLED'], ASSIGNED: ['ACCEPTED', 'NEW', 'CANCELLED'], ACCEPTED: ['TRAVELLING', 'ON_SITE', 'ASSIGNED', 'CANCELLED'], TRAVELLING: ['ON_SITE', 'ACCEPTED', 'CANCELLED'], ON_SITE: ['WAITING_FOR_PARTS', 'COMPLETED', 'CANCELLED'], WAITING_FOR_PARTS: ['ON_SITE', 'COMPLETED', 'CANCELLED'], COMPLETED: ['CLOSED', 'ON_SITE'], CLOSED: [], CANCELLED: [],
};

function readableStatus(status: WorkOrderStatus) { return status.replaceAll('_', ' '); }
function activityDescription(activity: WorkOrderActivity) {
  if (activity.type === 'WORK_ORDER_CREATED') return 'Work order created';
  if (activity.type === 'TECHNICIAN_ASSIGNED') return 'Technician assigned';
  if (activity.type === 'TECHNICIAN_CHANGED') return 'Technician changed';
  if (activity.type === 'TECHNICIAN_REMOVED') return 'Technician removed';
  if (activity.type === 'WORK_ORDER_CLOSED') return 'Work order closed';
  if (activity.type === 'WORK_ORDER_CANCELLED') return 'Work order cancelled';
  return `Status changed from ${activity.previousStatus ? readableStatus(activity.previousStatus) : 'unknown'} to ${activity.newStatus ? readableStatus(activity.newStatus) : 'unknown'}`;
}

export function WorkOrdersManager({ createdById }: { createdById: string }) {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [form, setForm] = useState<WorkOrderForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [timeline, setTimeline] = useState<WorkOrderActivity[]>([]);
  const availableProperties = useMemo(() => properties.filter((p) => !form.customerId || p.customerId === form.customerId), [properties, form.customerId]);

  async function load() {
    try {
      const [workData, customerData, propertyData, technicianData] = await Promise.all([
        api.workOrders('?page=1&pageSize=100'),
        api.customers('?page=1&pageSize=100'),
        api.properties('?page=1&pageSize=100'),
        api.technicians('?page=1&pageSize=100'),
      ]);
      setItems(workData.items);
      setCustomers(customerData.items);
      setProperties(propertyData.items);
      setTechnicians(technicianData.items);
      setForm((current) => current.customerId || !customerData.items[0] ? current : { ...current, customerId: customerData.items[0].id, propertyId: propertyData.items.find((p) => p.customerId === customerData.items[0].id)?.id ?? '' });
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load work orders.'); }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const workOrder = items.find((item) => item.id === editId);
    if (workOrder && editingId !== workOrder.id) edit(workOrder);
  }, [editId, editingId, items]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        technicianId: form.technicianId || null,
        scheduledAt: form.scheduledAt || undefined,
        completedAt: form.completedAt || undefined,
      };
      if (editingId) {
        const { status, ...updates } = payload;
        const updated = await api.updateWorkOrder(editingId, updates);
        if (status !== updated.status) await api.changeWorkOrderStatus(editingId, { status, actorId: createdById });
      }
      else await api.createWorkOrder({ ...payload, createdById });
      setEditingId(null);
      setForm({ ...emptyForm, customerId: customers[0]?.id ?? '', propertyId: properties.find((p) => p.customerId === customers[0]?.id)?.id ?? '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save work order.'); }
  }

  function edit(workOrder: WorkOrder) {
    setEditingId(workOrder.id);
    setForm({ customerId: workOrder.customerId, propertyId: workOrder.propertyId, technicianId: workOrder.technicianId ?? '', title: workOrder.title, description: workOrder.description ?? '', status: workOrder.status, priority: workOrder.priority, scheduledAt: workOrder.scheduledAt?.slice(0, 16) ?? '', completedAt: workOrder.completedAt?.slice(0, 16) ?? '' });
    void api.workOrderTimeline(workOrder.id).then(setTimeline).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load work order timeline.'));
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this work order?')) return;
    try { await api.deleteWorkOrder(id); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete work order.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Operations</p><h2>Work orders</h2><p>Schedule work, assign technicians, and keep status and priority current.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit work order' : 'New work order'}</h3></div>
        <label>Customer<select required value={form.customerId} onChange={(e) => { const customerId = e.target.value; setForm({ ...form, customerId, propertyId: properties.find((p) => p.customerId === customerId)?.id ?? '' }); }}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Property<select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property</option>{availableProperties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Technician<select value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">Unassigned</option>{technicians.filter((t) => t.status === 'ACTIVE' || t.id === form.technicianId).map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}{t.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select></label>
        <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Description<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrder['status'] })} disabled={!editingId}><option value={form.status}>{readableStatus(form.status)}</option>{editingId ? NEXT_STATUSES[form.status].map((status) => <option key={status} value={status}>{readableStatus(status)}</option>) : null}</select></label>
        <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrder['priority'] })}>{['LOW','NORMAL','HIGH','URGENT'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Scheduled at<input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton">Save work order</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setTimeline([]); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Work queue</h3></div><div className="dataList">
        {items.map((workOrder) => <article className="dataRow" key={workOrder.id}><div><strong>{workOrder.title}</strong><p>{workOrder.customer.name} · {workOrder.property.name} · {workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}` : 'Unassigned'}</p></div><div className="rowActions"><span className="statusPill">{workOrder.status.replaceAll('_', ' ')}</span><span className="priorityText">{workOrder.priority}</span><button onClick={() => edit(workOrder)}>Edit</button><button className="dangerButton" onClick={() => void remove(workOrder.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No work orders found</strong><p>Create a customer and property, then schedule the first job.</p></div> : null}
      </div>{editingId ? <div className="timeline"><h3>Timeline</h3>{timeline.length ? timeline.map((activity) => <article className="timelineItem" key={activity.id}><strong>{activityDescription(activity)}</strong><p>{activity.actor ? `${activity.actor.firstName} ${activity.actor.lastName} · ` : ''}{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.createdAt))}</p>{activity.note ? <p>{activity.note}</p> : null}</article>) : <p className="emptyState">No activity recorded yet.</p>}</div> : null}</section>
    </div>
  </>;
}
