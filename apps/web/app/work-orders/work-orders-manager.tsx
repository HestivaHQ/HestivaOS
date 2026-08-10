'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { displayCustomerName } from '../../lib/customer-display';
import { workOrderDisplayLabel, workOrderReference } from '../../lib/work-order-display';
import { api, Crew, Customer, Property, Technician, WorkOrder, Service, WorkOrderActivity, WorkOrderChecklistItem, WorkOrderStatus } from '../../lib/api';

type WorkOrderForm = { customerId: string; propertyId: string; technicianId: string; crewId: string; serviceId: string; description: string; status: WorkOrder['status']; priority: WorkOrder['priority']; scheduledAt: string; completedAt: string };
const emptyForm: WorkOrderForm = { customerId: '', propertyId: '', technicianId: '', crewId: '', serviceId: '', description: '', status: 'NEW', priority: 'NORMAL', scheduledAt: '', completedAt: '' };
const NEXT_STATUSES: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  NEW: ['ASSIGNED', 'CANCELLED'], ASSIGNED: ['ACCEPTED', 'NEW', 'CANCELLED'], ACCEPTED: ['TRAVELLING', 'ON_SITE', 'ASSIGNED', 'CANCELLED'], TRAVELLING: ['ON_SITE', 'ACCEPTED', 'CANCELLED'], ON_SITE: ['WAITING_FOR_PARTS', 'COMPLETED', 'CANCELLED'], WAITING_FOR_PARTS: ['ON_SITE', 'COMPLETED', 'CANCELLED'], COMPLETED: ['CLOSED', 'ON_SITE'], CLOSED: [], CANCELLED: [],
};

function readableStatus(status: string) { return status.replaceAll('_', ' '); }
function activityDescription(activity: WorkOrderActivity) {
  if (activity.type === 'WORK_ORDER_CREATED') return 'Work order created';
  if (activity.type === 'TECHNICIAN_ASSIGNED') return 'Technician assigned';
  if (activity.type === 'TECHNICIAN_CHANGED') return 'Technician changed';
  if (activity.type === 'TECHNICIAN_REMOVED') return 'Technician removed';
  if (activity.type === 'CREW_ASSIGNED') return 'Crew assigned';
  if (activity.type === 'CREW_CHANGED') return 'Crew changed';
  if (activity.type === 'CREW_REMOVED') return 'Crew removed';
  if (activity.type === 'WORK_ORDER_CLOSED') return 'Work order closed';
  if (activity.type === 'WORK_ORDER_CANCELLED') return 'Work order cancelled';
  return `Status changed from ${activity.previousStatus ? readableStatus(activity.previousStatus) : 'unknown'} to ${activity.newStatus ? readableStatus(activity.newStatus) : 'unknown'}`;
}

export function WorkOrdersManager({ createdById }: { createdById: string }) {
  const searchParams = useSearchParams();
  const createMode = searchParams.get('mode') === 'create';
  const preselectedCustomerId = createMode ? searchParams.get('customerId') : null;
  const preselectedPropertyId = createMode ? searchParams.get('propertyId') : null;
  const editId = searchParams.get('edit');
  const alert = searchParams.get('alert');
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<WorkOrderForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [timeline, setTimeline] = useState<WorkOrderActivity[]>([]);
  const [checklist, setChecklist] = useState<WorkOrderChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const availableProperties = useMemo(() => properties.filter((p) => !form.customerId || p.customerId === form.customerId), [properties, form.customerId]);
  const selectedCrew = useMemo(() => crews.find((crew) => crew.id === form.crewId), [crews, form.crewId]);
  const assignableTechnicians = useMemo(() => selectedCrew ? selectedCrew.members.map((member) => member.technician) : technicians, [selectedCrew, technicians]);

  async function load() {
    try {
      const [workData, customerData, propertyData, technicianData, crewData, serviceData] = await Promise.all([
        api.workOrders(`?page=1&pageSize=100${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}${alert ? `&alert=${encodeURIComponent(alert)}` : ''}`),
        api.customers('?page=1&pageSize=100'),
        api.properties('?page=1&pageSize=100'),
        api.technicians('?page=1&pageSize=100'),
        api.crews('?page=1&pageSize=100'),
        api.services('?page=1&pageSize=100'),
      ]);
      setItems(workData.items);
      setCustomers(customerData.items);
      setProperties(propertyData.items);
      setTechnicians(technicianData.items);
      setCrews(crewData.items);
      setServices(serviceData.items);
      const customer = preselectedCustomerId ? customerData.items.find((item) => item.id === preselectedCustomerId) : customerData.items[0];
      const property = preselectedPropertyId ? propertyData.items.find((item) => item.id === preselectedPropertyId && item.customerId === customer?.id) : propertyData.items.find((item) => item.customerId === customer?.id);
      setForm((current) => current.customerId || !customer ? current : { ...current, customerId: customer.id, propertyId: property?.id ?? '' });
      setError((preselectedCustomerId && !customer) || (preselectedPropertyId && !property) ? 'Validation failed. The selected customer or property is unavailable or mismatched.' : '');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load work orders.'); }
  }

  useEffect(() => { void load(); }, [alert, preselectedCustomerId, preselectedPropertyId, search]);
  useEffect(() => {
    const workOrder = items.find((item) => item.id === editId);
    if (workOrder && editingId !== workOrder.id) edit(workOrder);
  }, [editId, editingId, items]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = { ...form, technicianId: form.technicianId || null, crewId: form.crewId || null, scheduledAt: form.scheduledAt || undefined, completedAt: form.completedAt || undefined };
      if (editingId) {
        const { status, ...updates } = payload;
        const updated = await api.updateWorkOrder(editingId, updates);
        if (status !== updated.status) await api.changeWorkOrderStatus(editingId, { status, actorId: createdById });
      } else await api.createWorkOrder({ ...payload, createdById });
      setEditingId(null);
      setChecklist([]);
      setTimeline([]);
      setForm({ ...emptyForm, customerId: customers[0]?.id ?? '', propertyId: properties.find((p) => p.customerId === customers[0]?.id)?.id ?? '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save work order.'); }
  }

  function edit(workOrder: WorkOrder) {
    setEditingId(workOrder.id);
    setForm({ customerId: workOrder.customerId, propertyId: workOrder.propertyId, technicianId: workOrder.technicianId ?? '', crewId: workOrder.crewId ?? '', serviceId: workOrder.serviceId ?? '', description: workOrder.description ?? '', status: workOrder.status, priority: workOrder.priority, scheduledAt: workOrder.scheduledAt?.slice(0, 16) ?? '', completedAt: workOrder.completedAt?.slice(0, 16) ?? '' });
    void Promise.all([api.workOrderTimeline(workOrder.id), api.workOrderChecklist(workOrder.id)]).then(([activities, items]) => { setTimeline(activities); setChecklist(items); }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load work order details.'));
  }

  async function addChecklistItem() {
    if (!editingId || !newChecklistItem.trim()) return;
    try { await api.createWorkOrderChecklistItem(editingId, newChecklistItem); setNewChecklistItem(''); setChecklist(await api.workOrderChecklist(editingId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to add checklist item.'); }
  }

  async function updateChecklistItem(item: WorkOrderChecklistItem, status: WorkOrderChecklistItem['status']) {
    if (!editingId) return;
    try { await api.updateWorkOrderChecklistItem(editingId, item.id, { status }); setChecklist(await api.workOrderChecklist(editingId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update checklist item.'); }
  }

  async function deleteChecklistItem(itemId: string) {
    if (!editingId) return;
    try { await api.deleteWorkOrderChecklistItem(editingId, itemId); setChecklist(await api.workOrderChecklist(editingId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete checklist item.'); }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this work order?')) return;
    try { await api.deleteWorkOrder(id); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete work order.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Operations</p><h2>Work orders</h2><p>Schedule work, assign technicians or crews, and complete each job checklist.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit work order' : 'New work order'}</h3></div>
        <label>Customer<select required value={form.customerId} onChange={(e) => { const customerId = e.target.value; setForm({ ...form, customerId, propertyId: properties.find((p) => p.customerId === customerId)?.id ?? '' }); }}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{displayCustomerName(c)}</option>)}</select></label>
        <label>Property<select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property</option>{availableProperties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Crew<select value={form.crewId} onChange={(e) => { const crewId = e.target.value; const crew = crews.find((item) => item.id === crewId); setForm({ ...form, crewId, technicianId: crew?.members.some((member) => member.technicianId === form.technicianId) ? form.technicianId : '' }); }}><option value="">No crew</option>{crews.filter((crew) => crew.status === 'ACTIVE' || crew.id === form.crewId).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}{crew.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select></label>
        <label>{form.crewId ? 'Designated technician' : 'Technician'}<select value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">{form.crewId ? 'No designated technician' : 'Unassigned'}</option>{assignableTechnicians.filter((t) => t.status === 'ACTIVE' || t.id === form.technicianId).map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}{t.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select></label>
        {selectedCrew ? <p className="helpText">Crew leader: {selectedCrew.leader ? `${selectedCrew.leader.firstName} ${selectedCrew.leader.lastName}` : 'Not assigned'} · Members: {selectedCrew.members.map((member) => `${member.technician.firstName} ${member.technician.lastName}`).join(', ') || 'None'}</p> : null}
        {editingId ? <p><strong>Work Order Reference</strong><br />{workOrderReference(items.find((item) => item.id === editingId)!)}</p> : <p className="helpText"><strong>Work Order Reference</strong><br />Automatically generated when the job is created.</p>}
        <label>Service<select required={!editingId} value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}><option value="">Select service</option>{services.filter((service) => service.status === 'ACTIVE' || service.id === form.serviceId).map((service) => <option key={service.id} value={service.id}>{service.name}{service.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select></label>
        <label>Description<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrder['status'] })} disabled={!editingId}><option value={form.status}>{readableStatus(form.status)}</option>{editingId ? NEXT_STATUSES[form.status].map((status) => <option key={status} value={status}>{readableStatus(status)}</option>) : null}</select></label>
        <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrder['priority'] })}>{['LOW','NORMAL','HIGH','URGENT'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Scheduled at<input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton">Save work order</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setTimeline([]); setChecklist([]); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Work queue</h3><label>Search work orders<input className="searchInput" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, customer, property or service" /></label></div><div className="dataList">
        {items.map((workOrder) => <article className="dataRow" key={workOrder.id}><div><strong>{workOrderReference(workOrder)}</strong><p>{workOrderDisplayLabel(workOrder)}</p><p> · {workOrder.crew ? `Crew: ${workOrder.crew.name}` : workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}` : 'Unassigned'}{workOrder.crew && workOrder.technician ? ` · Designated: ${workOrder.technician.firstName} ${workOrder.technician.lastName}` : ''}</p></div><div className="rowActions"><span className="statusPill">{readableStatus(workOrder.status)}</span><span className="priorityText">{workOrder.priority}</span><Link href={`/work-orders/${workOrder.id}`}>Open job</Link><button onClick={() => edit(workOrder)}>Edit</button><button className="dangerButton" onClick={() => void remove(workOrder.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No work orders found</strong><p>Create a customer and property, then schedule the first job.</p></div> : null}
      </div>
      {editingId ? <>
        <div className="timeline"><h3>Job checklist</h3><div className="formActions"><input value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} placeholder="Add a cleaning task" /><button type="button" onClick={() => void addChecklistItem()}>Add</button></div>{checklist.length ? checklist.map((item) => <article className="timelineItem" key={item.id}><strong>{item.description}</strong><div className="rowActions"><select value={item.status} onChange={(e) => void updateChecklistItem(item, e.target.value as WorkOrderChecklistItem['status'])}><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="NOT_APPLICABLE">Not applicable</option></select><button className="dangerButton" onClick={() => void deleteChecklistItem(item.id)}>Remove</button></div></article>) : <p className="emptyState">No checklist items yet.</p>}</div>
        <div className="timeline"><h3>Timeline</h3>{timeline.length ? timeline.map((activity) => <article className="timelineItem" key={activity.id}><strong>{activityDescription(activity)}</strong><p>{activity.actor ? `${activity.actor.firstName} ${activity.actor.lastName} · ` : ''}{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.createdAt))}</p>{activity.note ? <p>{activity.note}</p> : null}</article>) : <p className="emptyState">No activity recorded yet.</p>}</div>
      </> : null}</section>
    </div>
  </>;
}
