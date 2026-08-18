'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, Customer, HomeCondition, Property, Service, WorkOrder, WorkOrderFrequency } from '../../../lib/api';
import { frequencyLabels, homeConditionLabels } from '../../../lib/work-order-display';
import { createClient } from '../../../lib/supabase/client';
import {
  commitWorkOrderMaterialChange,
  MaterialChangeAddOn,
  MaterialChangePayload,
  MaterialChangePreview,
  previewWorkOrderMaterialChange,
  workOrderMaterialChangeHistory,
  MaterialChangeHistory,
} from '../../../lib/work-order-material-change-api';

const CAPACITY_REVIEW_NAMES = new Set(['laundry', 'ironing']);

function sameAddOns(left: MaterialChangeAddOn[], right: MaterialChangeAddOn[]) {
  const normalize = (items: MaterialChangeAddOn[]) => items
    .map((item) => ({ serviceId: item.serviceId, quantity: item.quantity }))
    .sort((a, b) => a.serviceId.localeCompare(b.serviceId));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

async function accessToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('An authenticated Admin session is required.');
  return session.access_token;
}

export function MaterialChangeAdminPanel({ workOrderId }: { workOrderId: string }) {
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [primaryServices, setPrimaryServices] = useState<Service[]>([]);
  const [addOnServices, setAddOnServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [frequency, setFrequency] = useState<WorkOrderFrequency | ''>('');
  const [customFrequencyNote, setCustomFrequencyNote] = useState('');
  const [homeCondition, setHomeCondition] = useState<HomeCondition | ''>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [addOns, setAddOns] = useState<MaterialChangeAddOn[]>([]);
  const [cancelJob, setCancelJob] = useState(false);
  const [reason, setReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [preview, setPreview] = useState<MaterialChangePreview | null>(null);
  const [history, setHistory] = useState<MaterialChangeHistory[]>([]);
  const [operationId, setOperationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const availableProperties = useMemo(
    () => properties.filter((item) => item.customerId === customerId),
    [customerId, properties],
  );
  const selectablePrimaryServices = useMemo(() => {
    if (!job?.service || primaryServices.some((item) => item.id === job.service?.id)) return primaryServices;
    return [job.service, ...primaryServices];
  }, [job, primaryServices]);
  const selectableAddOns = useMemo(() => {
    const historical = job?.addOns.map((item) => item.service) ?? [];
    return [...addOnServices, ...historical.filter((item) => !addOnServices.some((active) => active.id === item.id))];
  }, [addOnServices, job]);

  function resetFromJob(workOrder: WorkOrder) {
    setCustomerId(workOrder.customerId);
    setPropertyId(workOrder.propertyId);
    setServiceId(workOrder.serviceId ?? '');
    setFrequency(workOrder.frequency ?? '');
    setCustomFrequencyNote(workOrder.customFrequencyNote ?? '');
    setHomeCondition(workOrder.homeCondition ?? '');
    setScheduledAt(workOrder.scheduledAt?.slice(0, 16) ?? '');
    setAddOns(workOrder.addOns.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity, capacityApproved: true })));
    setCancelJob(false);
    setReason('');
    setOverrideReason('');
    setPreview(null);
    setOperationId('');
  }

  async function load() {
    try {
      const token = await accessToken();
      const [current, customerData, propertyData, primaryData, addOnData, changeHistory] = await Promise.all([
        api.workOrder(workOrderId),
        api.customers('?page=1&pageSize=100'),
        api.properties('?page=1&pageSize=100'),
        api.services('?page=1&pageSize=100&status=ACTIVE&type=PRIMARY'),
        api.services('?page=1&pageSize=100&status=ACTIVE&type=ADD_ON'),
        workOrderMaterialChangeHistory(token, workOrderId),
      ]);
      setJob(current);
      setCustomers(customerData.items);
      setProperties(propertyData.items);
      setPrimaryServices(primaryData.items);
      setAddOnServices(addOnData.items);
      setHistory(changeHistory);
      resetFromJob(current);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load material-change controls.');
    }
  }

  useEffect(() => { void load(); }, [workOrderId]);

  function selectedAddOn(serviceIdValue: string) {
    return addOns.find((item) => item.serviceId === serviceIdValue);
  }

  function toggleAddOn(service: Service, checked: boolean) {
    setPreview(null);
    setOperationId('');
    setAddOns((current) => checked
      ? [...current, { serviceId: service.id, quantity: 1, capacityApproved: !CAPACITY_REVIEW_NAMES.has(service.name.trim().toLowerCase()) }]
      : current.filter((item) => item.serviceId !== service.id));
  }

  function updateAddOn(serviceIdValue: string, patch: Partial<MaterialChangeAddOn>) {
    setPreview(null);
    setOperationId('');
    setAddOns((current) => current.map((item) => item.serviceId === serviceIdValue ? { ...item, ...patch } : item));
  }

  function buildPayload(): MaterialChangePayload {
    if (!job) return {};
    const payload: MaterialChangePayload = {};
    if (customerId !== job.customerId) payload.customerId = customerId;
    if (propertyId !== job.propertyId) payload.propertyId = propertyId;
    if (serviceId !== (job.serviceId ?? '')) payload.serviceId = serviceId;
    if (frequency !== (job.frequency ?? '')) {
      payload.frequency = frequency || null;
      payload.customFrequencyNote = frequency === 'CUSTOM' ? customFrequencyNote || null : null;
    } else if (frequency === 'CUSTOM' && customFrequencyNote !== (job.customFrequencyNote ?? '')) {
      payload.customFrequencyNote = customFrequencyNote || null;
    }
    if (homeCondition !== (job.homeCondition ?? '')) payload.homeCondition = homeCondition || null;
    if (scheduledAt !== (job.scheduledAt?.slice(0, 16) ?? '')) payload.scheduledAt = scheduledAt || null;
    const currentAddOns = job.addOns.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity }));
    if (!sameAddOns(addOns, currentAddOns)) payload.addOns = addOns;
    if (cancelJob && job.status !== 'CANCELLED') payload.status = 'CANCELLED';
    return payload;
  }

  async function review() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = await accessToken();
      const result = await previewWorkOrderMaterialChange(token, workOrderId, buildPayload());
      setPreview(result);
      setOperationId(crypto.randomUUID());
    } catch (err) {
      setPreview(null);
      setOperationId('');
      setError(err instanceof Error ? err.message : 'Unable to review consequences.');
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview || !operationId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = await accessToken();
      await commitWorkOrderMaterialChange(token, workOrderId, {
        ...buildPayload(),
        operationId,
        expectedUpdatedAt: preview.expectedUpdatedAt,
        reason: reason.trim() || undefined,
        overrideReason: overrideReason.trim() || undefined,
      });
      setMessage('Material Work Order change applied and recorded.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply material change.');
    } finally {
      setBusy(false);
    }
  }

  if (!job) return <section className="panel"><div className="panelHeader"><h3>Material changes</h3></div>{error ? <p className="errorBanner">{error}</p> : <p>Loading controls…</p>}</section>;

  return <section className="panel resourceForm">
    <div className="panelHeader"><div><p className="eyebrow">Admin control</p><h3>Material Work Order change</h3></div><span className="statusPill">{job.status.replaceAll('_', ' ')}</span></div>
    <p>Review operational consequences before changing a confirmed booking. In-progress and historical jobs fail closed instead of rewriting field history.</p>
    {error ? <p className="errorBanner">{error}</p> : null}
    {message ? <p className="successBanner">{message}</p> : null}

    <label>Customer<select value={customerId} onChange={(event) => { const next = event.target.value; setCustomerId(next); setPropertyId(properties.find((item) => item.customerId === next)?.id ?? ''); setPreview(null); }}><option value="">Select customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.contactName || item.name}</option>)}</select></label>
    <label>Property<select value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setPreview(null); }}><option value="">Select property</option>{availableProperties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Primary service<select value={serviceId} onChange={(event) => { setServiceId(event.target.value); setPreview(null); }}><option value="">Select service</option>{selectablePrimaryServices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Frequency<select value={frequency} onChange={(event) => { setFrequency(event.target.value as WorkOrderFrequency | ''); setPreview(null); }}><option value="">Not set</option>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {frequency === 'CUSTOM' ? <label>Custom frequency<input value={customFrequencyNote} onChange={(event) => { setCustomFrequencyNote(event.target.value); setPreview(null); }} /></label> : null}
    <label>Home condition<select value={homeCondition} onChange={(event) => { setHomeCondition(event.target.value as HomeCondition | ''); setPreview(null); }}><option value="">Not set</option>{Object.entries(homeConditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Scheduled date and time<input type="datetime-local" value={scheduledAt} onChange={(event) => { setScheduledAt(event.target.value); setPreview(null); }} /></label>

    <fieldset><legend>Add-ons and quantities</legend>{selectableAddOns.map((service) => { const selected = selectedAddOn(service.id); const needsCapacity = CAPACITY_REVIEW_NAMES.has(service.name.trim().toLowerCase()); return <div key={service.id} className="dataRow"><label><input type="checkbox" checked={Boolean(selected)} onChange={(event) => toggleAddOn(service, event.target.checked)} /> {service.name}</label>{selected ? <><label>Quantity<input type="number" min={1} value={selected.quantity} onChange={(event) => updateAddOn(service.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>{needsCapacity ? <label><input type="checkbox" checked={selected.capacityApproved === true} onChange={(event) => updateAddOn(service.id, { capacityApproved: event.target.checked })} /> Labour/time capacity approved</label> : null}</> : null}</div>; })}</fieldset>

    <label><input type="checkbox" checked={cancelJob} onChange={(event) => { setCancelJob(event.target.checked); setPreview(null); }} /> Cancel this Work Order</label>
    <label>Reason (optional unless your operational policy requires context)<textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></label>

    <button className="primaryButton" type="button" disabled={busy} onClick={() => void review()}>{busy ? 'Reviewing…' : 'Review consequences'}</button>

    {preview ? <div className="completionReview">
      <h3>{preview.allowed ? 'Change can proceed' : 'Change blocked'}</h3>
      <p><strong>Operational stage:</strong> {preview.stage.replaceAll('_', ' ')}<br/><strong>Material fields:</strong> {preview.materialFields.join(', ') || 'None'}</p>
      {preview.blockedReason ? <p className="errorBanner">{preview.blockedReason}</p> : null}
      <p><strong>Consequence review</strong><br/>{[
        preview.consequences.schedulingReview ? 'Scheduling' : null,
        preview.consequences.staffingReview ? 'Staffing' : null,
        preview.consequences.pricingReview ? 'Pricing' : null,
        preview.consequences.executionScopeReview ? 'Execution scope' : null,
        preview.consequences.customerCorrespondenceEligible ? 'Customer correspondence eligibility' : null,
        preview.consequences.financialReviewBoundary ? 'Financial review boundary' : null,
      ].filter(Boolean).join(' · ') || 'No additional consequences detected'}</p>
      {preview.boundaries.correspondence ? <p>{preview.boundaries.correspondence}</p> : null}
      {preview.boundaries.finance ? <p>{preview.boundaries.finance}</p> : null}
      {preview.overrideReasonRequired ? <label>Required imminent-change override reason<textarea value={overrideReason} maxLength={500} onChange={(event) => setOverrideReason(event.target.value)} /></label> : null}
      {preview.allowed ? <button className="dangerButton" type="button" disabled={busy || (preview.overrideReasonRequired && overrideReason.trim().length < 3)} onClick={() => void commit()}>{busy ? 'Applying…' : 'Apply reviewed change'}</button> : null}
    </div> : null}

    <div className="panelHeader"><h3>Material change history</h3><span>{history.length}</span></div>
    <div className="dataList">{history.slice().reverse().map((item) => <article className="dataRow" key={item.id}><div><strong>{item.stage.replaceAll('_', ' ')} change</strong><p>{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}{item.reason ? ` · ${item.reason}` : ''}{item.overrideReason ? ` · Override: ${item.overrideReason}` : ''}</p></div></article>)}{!history.length ? <div className="emptyState"><strong>No material changes recorded</strong></div> : null}</div>
  </section>;
}
