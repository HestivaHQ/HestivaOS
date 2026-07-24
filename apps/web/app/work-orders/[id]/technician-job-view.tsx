'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, WorkOrder, WorkOrderChecklistItem, WorkOrderStatus } from '../../../lib/api';

const NEXT_ACTION: Partial<Record<WorkOrderStatus, { label: string; status: WorkOrderStatus }>> = {
  ASSIGNED: { label: 'Accept job', status: 'ACCEPTED' },
  ACCEPTED: { label: 'Start travelling', status: 'TRAVELLING' },
  TRAVELLING: { label: 'Arrived on site', status: 'ON_SITE' },
  ON_SITE: { label: 'Complete job', status: 'COMPLETED' },
  WAITING_FOR_PARTS: { label: 'Resume on site', status: 'ON_SITE' },
};

function readableStatus(value: string) { return value.replaceAll('_', ' '); }

export function TechnicianJobView({ workOrderId }: { workOrderId: string }) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [checklist, setChecklist] = useState<WorkOrderChecklistItem[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [job, items] = await Promise.all([api.workOrder(workOrderId), api.workOrderChecklist(workOrderId)]);
      setWorkOrder(job);
      setChecklist(items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load job.');
    }
  }

  useEffect(() => { void load(); }, [workOrderId]);

  async function changeStatus(status: WorkOrderStatus) {
    setSaving(true);
    try {
      await api.changeWorkOrderStatus(workOrderId, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update job status.');
    } finally {
      setSaving(false);
    }
  }

  async function updateChecklist(item: WorkOrderChecklistItem, status: WorkOrderChecklistItem['status']) {
    try {
      await api.updateWorkOrderChecklistItem(workOrderId, item.id, { status });
      setChecklist(await api.workOrderChecklist(workOrderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update checklist.');
    }
  }

  if (!workOrder) return <section className="panel"><Link href="/work-orders">← Work orders</Link>{error ? <p className="errorBanner">{error}</p> : <p>Loading job…</p>}</section>;

  const action = NEXT_ACTION[workOrder.status];
  const address = [workOrder.property.addressLine1, workOrder.property.addressLine2, workOrder.property.city, workOrder.property.province, workOrder.property.postalCode].filter(Boolean).join(', ');
  const completedCount = checklist.filter((item) => item.status !== 'PENDING').length;

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Technician job</p><h2>{workOrder.title}</h2><p>{workOrder.customer.name} · {workOrder.property.name}</p></div><Link href="/work-orders">Back to work orders</Link></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <section className="panel resourceForm">
        <div className="panelHeader"><h3>Job details</h3><span className="statusPill">{readableStatus(workOrder.status)}</span></div>
        <p><strong>Scheduled</strong><br />{workOrder.scheduledAt ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(workOrder.scheduledAt)) : 'Not scheduled'}</p>
        <p><strong>Address</strong><br />{address}</p>
        {workOrder.property.accessNotes ? <p><strong>Access instructions</strong><br />{workOrder.property.accessNotes}</p> : null}
        {workOrder.description ? <p><strong>Job notes</strong><br />{workOrder.description}</p> : null}
        <p><strong>Assigned technician</strong><br />{workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}` : 'Unassigned'}</p>
        {action ? <button className="primaryButton" disabled={saving} onClick={() => void changeStatus(action.status)}>{saving ? 'Updating…' : action.label}</button> : null}
      </section>

      <section className="panel">
        <div className="panelHeader"><h3>Cleaning checklist</h3><span>{completedCount}/{checklist.length}</span></div>
        <div className="dataList">
          {checklist.map((item) => <article className="dataRow" key={item.id}><div><strong>{item.description}</strong><p>{readableStatus(item.status)}</p></div><select value={item.status} onChange={(event) => void updateChecklist(item, event.target.value as WorkOrderChecklistItem['status'])}><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="NOT_APPLICABLE">Not applicable</option></select></article>)}
          {!checklist.length ? <div className="emptyState"><strong>No checklist items</strong><p>The office can add tasks from the work-order screen.</p></div> : null}
        </div>
      </section>
    </div>
  </>;
}
