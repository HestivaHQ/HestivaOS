'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { displayCustomerName } from '../../lib/customer-display';
import { frequencyLabels, homeConditionLabels, workOrderDisplayLabel, workOrderFrequencyLabel, workOrderReference } from '../../lib/work-order-display';
import { api, Crew, Customer, Property, Technician, WorkOrder, Service, WorkOrderActivity, WorkOrderChecklistItem, WorkOrderStatus, WorkOrderFrequency, HomeCondition } from '../../lib/api';

type AddOnFormValue = { serviceId: string; quantity: number; capacityApproved: boolean };
type WorkOrderForm = { customerId: string; propertyId: string; technicianId: string; crewId: string; serviceId: string; addOns: AddOnFormValue[]; frequency: WorkOrderFrequency | ''; customFrequencyNote: string; homeCondition: HomeCondition | ''; description: string; status: WorkOrder['status']; priority: WorkOrder['priority']; scheduledAt: string; completedAt: string };
const emptyForm: WorkOrderForm = { customerId: '', propertyId: '', technicianId: '', crewId: '', serviceId: '', addOns: [], frequency: '', customFrequencyNote: '', homeCondition: '', description: '', status: 'NEW', priority: 'NORMAL', scheduledAt: '', completedAt: '' };
const propertyCountLabels: Record<string, string> = { STUDIO: 'Studio', ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE_PLUS: '5+', OTHER: 'Other', FOUR_PLUS: '4+', THREE_PLUS: '3+ (legacy)', UNKNOWN: 'Not sure' };
const floorSizeLabels: Record<string, string> = { UNDER_40: 'Under 40 m²', FROM_40_TO_59: '40–59 m²', FROM_60_TO_79: '60–79 m²', FROM_80_TO_99: '80–99 m²', FROM_100_TO_129: '100–129 m²', FROM_130_TO_169: '130–169 m²', FROM_170_TO_219: '170–219 m²', FROM_220_TO_299: '220–299 m²', FROM_300_UP: '300+ m²', UNDER_80: 'Under 80 m² (legacy)', FROM_80_TO_150: '80–150 m² (legacy)', FROM_151_TO_250: '151–250 m² (legacy)', OVER_250: 'Over 250 m² (legacy)', UNKNOWN: 'Not sure' };
const unitFloorLabels: Record<string, string> = { GROUND: 'Ground floor', FIRST: '1st floor', SECOND: '2nd floor', THIRD: '3rd floor', FOURTH: '4th floor', FIFTH_TO_NINTH: '5th–9th floor', TENTH_PLUS: '10th floor or above', THIRD_PLUS: '3rd floor or above', UNKNOWN: 'Not sure' };
const outdoorLabels: Record<string, string> = { NONE: 'No outdoor area', BALCONY: 'Balcony', PATIO: 'Patio', BOTH: 'Balcony and patio' };
const estateLabels: Record<string, string> = { NONE: 'Not in an estate or complex', ESTATE: 'Estate', COMPLEX: 'Complex', GATED_COMMUNITY: 'Gated community' };
const CAPACITY_REVIEW_NAMES = new Set(['laundry', 'ironing']);
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
  const [primaryServices, setPrimaryServices] = useState<Service[]>([]);
  const [addOnServices, setAddOnServices] = useState<Service[]>([]);
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
  const selectableAddOns = useMemo(() => { const historical = items.find((item) => item.id === editingId)?.addOns.map((item) => item.service) ?? []; return [...addOnServices, ...historical.filter((service) => !addOnServices.some((active) => active.id === service.id))]; }, [addOnServices, editingId, items]);

  function selectedAddOn(serviceId: string) { return form.addOns.find((item) => item.serviceId === serviceId); }
  function toggleAddOn(service: Service, checked: boolean) {
    setForm((current) => ({ ...current, addOns: checked ? [...current.addOns, { serviceId: service.id, quantity: 1, capacityApproved: !CAPACITY_REVIEW_NAMES.has(service.name.trim().toLowerCase()) }] : current.addOns.filter((item) => item.serviceId !== service.id) }));
  }
  function updateAddOn(serviceId: string, patch: Partial<AddOnFormValue>) {
    setForm((current) => ({ ...current, addOns: current.addOns.map((item) => item.serviceId === serviceId ? { ...item, ...patch } : item) }));
  }

  async function loadReferenceData() {
    try {
      const [customerData, propertyData, technicianData, crewData, primaryData, addOnData] = await Promise.all([
        api.customers('?page=1&pageSize=100'),
        api.properties('?page=1&pageSize=100'),
        api.technicians('?page=1&pageSize=100'),
        api.crews('?page=1&pageSize=100'),
        api.services('?page=1&pageSize=100&status=ACTIVE&type=PRIMARY'),
        api.services('?page=1&pageSize=100&status=ACTIVE&type=ADD_ON'),
      ]);
      setCustomers(customerData.items);
      setProperties(propertyData.items);
      setTechnicians(technicianData.items);
      setCrews(crewData.items);
      setPrimaryServices(primaryData.items);
      setAddOnServices(addOnData.items);
      const customer = preselectedCustomerId ? customerData.items.find((item) => item.id === preselectedCustomerId) : customerData.items[0];
      const property = preselectedPropertyId ? propertyData.items.find((item) => item.id === preselectedPropertyId && item.customerId === customer?.id) : propertyData.items.find((item) => item.customerId === customer?.id);
      setForm((current) => current.customerId || !customer ? current : { ...current, customerId: customer.id, propertyId: property?.id ?? '' });
      setError((preselectedCustomerId && !customer) || (preselectedPropertyId && !property) ? 'Validation failed. The selected customer or property is unavailable or mismatched.' : '');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load work-order reference data.'); }
  }

  async function loadWorkOrders() {
    try {
      const workData = await api.workOrders(`?page=1&pageSize=100${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}${alert ? `&alert=${encodeURIComponent(alert)}` : ''}`);
      setItems(workData.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load work orders.'); }
  }

  useEffect(() => { void loadReferenceData(); }, [preselectedCustomerId, preselectedPropertyId]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkOrders(); }, 300);
    return () => window.clearTimeout(timer);
  }, [alert, search]);
  useEffect(() => {
    const workOrder = items.find((item) => item.id === editId);
    if (workOrder && editingId !== workOrder.id) edit(workOrder);
  }, [editId, editingId, items]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = { ...form, frequency: form.frequency || null, customFrequencyNote: form.frequency === 'CUSTOM' ? form.customFrequencyNote || null : null, homeCondition: form.homeCondition || null, technicianId: form.technicianId || null, crewId: form.crewId || null, scheduledAt: form.scheduledAt || undefined, completedAt: form.completedAt || undefined };
      if (editingId) {
        const { status, ...updates } = payload;
        const updated = await api.updateWorkOrder(editingId, updates);
        if (status !== updated.status) await api.changeWorkOrderStatus(editingId, { status, actorId: createdById });
      } else await api.createWorkOrder({ ...payload, createdById });
      setEditingId(null);
      setChecklist([]);
      setTimeline([]);
      setForm({ ...emptyForm, customerId: customers[0]?.id ?? '', propertyId: properties.find((p) => p.customerId === customers[0]?.id)?.id ?? '' });
      await loadWorkOrders();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save work order.'); }
  }

  function edit(workOrder: WorkOrder) {
    setEditingId(workOrder.id);
    setForm({ customerId: workOrder.customerId, propertyId: workOrder.propertyId, technicianId: workOrder.technicianId ?? '', crewId: workOrder.crewId ?? '', serviceId: workOrder.serviceId ?? '', addOns: workOrder.addOns.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity, capacityApproved: true })), frequency: workOrder.frequency ?? '', customFrequencyNote: workOrder.customFrequencyNote ?? '', homeCondition: workOrder.homeCondition ?? '', description: workOrder.description ?? '', status: workOrder.status, priority: workOrder.priority, scheduledAt: workOrder.scheduledAt?.slice(0, 16) ?? '', completedAt: workOrder.completedAt?.slice(0, 16) ?? '' });
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
    try { await api.deleteWorkOrder(id); await loadWorkOrders(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete work order.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Operations</p><h2>Work orders</h2><p>Schedule work, assign technicians or crews, and complete each job checklist.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit work order' : 'New work order'}</h3></div>
        <label>Customer<select required value={form.customerId} onChange={(e) => { const customerId = e.target.value; setForm({ ...form, customerId, propertyId: properties.find((p) => p.customerId === customerId)?.id ?? '' }); }}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{displayCustomerName(c)}</option>)}</select></label>
        <label>Property<select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property</option>{availableProperties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <h4>Assignment</h4>
        <label>Crew<select value={form.crewId} onChange={(e) => { const crewId = e.target.value; const crew = crews.find((item) => item.id === crewId); setForm({ ...form, crewId, technicianId: crew?.members.some((member) => member.technicianId === form.technicianId) ? form.technicianId : '' }); }}><option value="">No crew</option>{crews.filter((crew) => crew.status === 'ACTIVE' || crew.id === form.crewId).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}{crew.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select></label>
        <label>{form.crewId ? 'Designated technician' : 'Technician'}<select value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">{form.crewId ? 'No designated technician' : 'Unassigned'}</option>{assignableTechnicians.filter((t) => t.status === 'ACTIVE' || t.id === form.technicianId).map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}{t.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select></label>
        {selectedCrew ? <p className="helpText">Crew leader: {selectedCrew.leader ? `${selectedCrew.leader.firstName} ${selectedCrew.leader.lastName}` : 'Not assigned'} · Members: {selectedCrew.members.map((member) => `${member.technician.firstName} ${member.technician.lastName}`).join(', ') || 'None'}</p> : null}
        {editingId ? <p><strong>Work Order Reference</strong><br />{workOrderReference(items.find((item) => item.id === editingId)!)}</p> : <p className="helpText"><strong>Work Order Reference</strong><br />Automatically generated when the job is created.</p>}
        <h4>Job</h4>
        <label>Primary Service<select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}><option value="">Select primary service</option>{[...primaryServices, ...(editingId && ['PRIMARY', 'BOTH'].includes(items.find((item) => item.id === editingId)?.service?.type ?? '') && !primaryServices.some((service) => service.id === form.serviceId) ? [items.find((item) => item.id === editingId)!.service!] : [])].map((service) => <option key={service.id} value={service.id}>{service.name}{service.status === 'INACTIVE' ? ' (inactive, historical)' : ''}</option>)}</select></label>
        <fieldset className="addOnSection"><legend>Add-ons</legend><p className="helpText">Select optional services and the accepted quantity. Laundry and Ironing require an explicit labour/time capacity check.</p>{selectableAddOns.length ? <div className="addOnGrid">{selectableAddOns.map((service) => { const inputId = `work-order-add-on-${service.id}`; const selected = selectedAddOn(service.id); const needsCapacity = CAPACITY_REVIEW_NAMES.has(service.name.trim().toLowerCase()); return <div className={`addOnOption${selected ? ' addOnOptionSelected' : ''}${service.status === 'INACTIVE' ? ' addOnOptionInactive' : ''}`} key={service.id}><label htmlFor={inputId}><input id={inputId} type="checkbox" checked={Boolean(selected)} onChange={(event) => toggleAddOn(service, event.target.checked)} /><span>{service.name}{service.status === 'INACTIVE' ? <small>Inactive · historical selection</small> : null}</span></label>{selected ? <><label>Quantity<input type="number" min={1} step={1} value={selected.quantity} onChange={(event) => updateAddOn(service.id, { quantity: Math.max(1, Number.parseInt(event.target.value || '1', 10)) })} /></label>{needsCapacity ? <label><input type="checkbox" checked={selected.capacityApproved} onChange={(event) => updateAddOn(service.id, { capacityApproved: event.target.checked })} /> Labour/time capacity checked for this job</label> : null}</> : null}</div>; })}</div> : <p className="addOnEmptyState">No add-ons are currently available.</p>}</fieldset>
        <label>Frequency<select required value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as WorkOrderFrequency | '', customFrequencyNote: e.target.value === 'CUSTOM' ? form.customFrequencyNote : '' })}><option value="">Select frequency</option>{Object.entries(frequencyLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        {form.frequency === 'CUSTOM' ? <label>Custom frequency note<input maxLength={120} placeholder="For example, every 3 weeks" value={form.customFrequencyNote} onChange={(e) => setForm({ ...form, customFrequencyNote: e.target.value })} /></label> : null}
        <label>Home Condition<select required value={form.homeCondition} onChange={(e) => setForm({ ...form, homeCondition: e.target.value as HomeCondition | '' })}><option value="">Select home condition</option>{Object.entries(homeConditionLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <h4>Property snapshot — current profile</h4>{(() => { const property = properties.find((item) => item.id === form.propertyId); if (!property) return <p className="helpText">Select a property to view its profile.</p>; const facts = [property.propertyTypeOption?.label, property.floorSize && floorSizeLabels[property.floorSize], property.bedrooms && `${propertyCountLabels[property.bedrooms]} ${property.bedrooms === 'ONE' ? 'bedroom' : 'bedrooms'}`, property.bathrooms && `${propertyCountLabels[property.bathrooms]} ${property.bathrooms === 'ONE' ? 'bathroom' : 'bathrooms'}`, property.livingAreas && `${propertyCountLabels[property.livingAreas]} living areas`, property.storeys && `${propertyCountLabels[property.storeys]} ${property.storeys === 'ONE' ? 'storey' : 'storeys'}`, property.unitFloor && unitFloorLabels[property.unitFloor], property.outdoorArea && outdoorLabels[property.outdoorArea], property.estateClassification && estateLabels[property.estateClassification], !property.estateClassification && property.isEstateOrComplex ? 'Estate / complex (legacy; classification unresolved)' : null, property.hasPets ? 'Pets present' : null].filter(Boolean); const access = [property.requiresGateSecurityAccess ? 'Gate/security access required' : null, property.accessNotes, property.parkingNotes].filter(Boolean); const care = [property.petNotes, property.hasCameras ? 'Security cameras present' : null, property.offLimitsNotes, property.fragileItemNotes, property.productRestrictionNotes, property.allergyNotes].filter(Boolean); return <div className="propertySnapshot"><strong>{property.name}</strong><p>{[property.addressLine1, property.city].filter(Boolean).join(' · ')}</p>{facts.length ? <p>{facts.join(' · ')}</p> : null}{access.length ? <p><strong>Access:</strong> {access.join(' · ')}</p> : null}{care.length ? <p><strong>Care notes:</strong> {care.join(' · ')}</p> : null}{!access.length && !care.length ? <p className="helpText">No operational access or care notes recorded.</p> : null}</div>; })()}
        <h4>Visit</h4>
        <label>Job-specific instructions<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Visit-specific areas, temporary access changes, or special instructions" /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrder['status'] })} disabled={!editingId}><option value={form.status}>{readableStatus(form.status)}</option>{editingId ? NEXT_STATUSES[form.status].map((status) => <option key={status} value={status}>{readableStatus(status)}</option>) : null}</select></label>
        <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrder['priority'] })}>{['LOW','NORMAL','HIGH','URGENT'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Scheduled at<input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton">Save work order</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setTimeline([]); setChecklist([]); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Work queue</h3><label>Search work orders<input className="searchInput" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, customer, property or service" /></label></div><div className="dataList">
        {items.map((workOrder) => <article className="dataRow" key={workOrder.id}><div><strong>{workOrderReference(workOrder)}</strong><p>{workOrderDisplayLabel(workOrder)}</p><p>{workOrderFrequencyLabel(workOrder)}{workOrder.homeCondition ? ` · ${homeConditionLabels[workOrder.homeCondition]}` : ''}</p>{workOrder.addOns.length ? <p>Add-ons: {workOrder.addOns.map((item) => `${item.service.name} × ${item.quantity}`).join(', ')}</p> : null}<p> {workOrder.crew ? `Crew: ${workOrder.crew.name}` : workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}` : 'Unassigned'}{workOrder.crew && workOrder.technician ? ` · Designated: ${workOrder.technician.firstName} ${workOrder.technician.lastName}` : ''}</p></div><div className="rowActions"><span className="statusPill">{readableStatus(workOrder.status)}</span><span className="priorityText">{workOrder.priority}</span><Link href={`/work-orders/${workOrder.id}`}>Open job</Link><button onClick={() => edit(workOrder)}>Edit</button><button className="dangerButton" onClick={() => void remove(workOrder.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No work orders found</strong><p>Create a customer and property, then schedule the first job.</p></div> : null}
      </div>
      {editingId ? <>
        <div className="timeline"><h3>Job checklist</h3><div className="formActions"><input value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} placeholder="Add a cleaning task" /><button type="button" onClick={() => void addChecklistItem()}>Add</button></div>{checklist.length ? checklist.map((item) => <article className="timelineItem" key={item.id}><strong>{item.description}</strong><div className="rowActions"><select value={item.status} onChange={(e) => void updateChecklistItem(item, e.target.value as WorkOrderChecklistItem['status'])}><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="NOT_APPLICABLE">Not applicable</option></select><button className="dangerButton" onClick={() => void deleteChecklistItem(item.id)}>Remove</button></div></article>) : <p className="emptyState">No checklist items yet.</p>}</div>
        <div className="timeline"><h3>Timeline</h3>{timeline.length ? timeline.map((activity) => <article className="timelineItem" key={activity.id}><strong>{activityDescription(activity)}</strong><p>{activity.actor ? `${activity.actor.firstName} ${activity.actor.lastName} · ` : ''}{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.createdAt))}</p>{activity.note ? <p>{activity.note}</p> : null}</article>) : <p className="emptyState">No activity recorded yet.</p>}</div>
      </> : null}</section>
    </div>
  </>;
}
