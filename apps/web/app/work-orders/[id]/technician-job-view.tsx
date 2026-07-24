'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useState } from 'react';
import { api, WorkOrder, WorkOrderChecklistItem, WorkOrderPhoto, WorkOrderStatus } from '../../../lib/api';
import { createClient } from '../../../lib/supabase/client';

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
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const [job, items, jobPhotos] = await Promise.all([
        api.workOrder(workOrderId),
        api.workOrderChecklist(workOrderId),
        api.workOrderPhotos(workOrderId),
      ]);
      setWorkOrder(job);
      setChecklist(items);
      setPhotos(jobPhotos);
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

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>, category: WorkOrderPhoto['category']) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Only image files can be uploaded.'); return; }
    setUploading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.email) throw new Error('Authenticated user is required.');
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET || 'work-order-photos';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const storagePath = `${workOrderId}/${category.toLowerCase()}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      try {
        await api.createWorkOrderPhoto(workOrderId, { category, url: data.publicUrl, storagePath, uploadedBy: session.user.email });
      } catch (metadataError) {
        await supabase.storage.from(bucket).remove([storagePath]);
        throw metadataError;
      }
      setPhotos(await api.workOrderPhotos(workOrderId));
      event.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photo: WorkOrderPhoto) {
    if (!window.confirm('Remove this photo?')) return;
    try {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET || 'work-order-photos';
      const supabase = createClient();
      await api.deleteWorkOrderPhoto(workOrderId, photo.id);
      const { error: storageError } = await supabase.storage.from(bucket).remove([photo.storagePath]);
      if (storageError) setError(`Photo record removed, but storage cleanup failed: ${storageError.message}`);
      setPhotos(await api.workOrderPhotos(workOrderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove photo.');
    }
  }

  if (!workOrder) return <section className="panel"><Link href="/work-orders">← Work orders</Link>{error ? <p className="errorBanner">{error}</p> : <p>Loading job…</p>}</section>;

  const action = NEXT_ACTION[workOrder.status];
  const address = [workOrder.property.addressLine1, workOrder.property.addressLine2, workOrder.property.city, workOrder.property.province, workOrder.property.postalCode].filter(Boolean).join(', ');
  const completedCount = checklist.filter((item) => item.status !== 'PENDING').length;
  const beforePhotos = photos.filter((photo) => photo.category === 'BEFORE');
  const afterPhotos = photos.filter((photo) => photo.category === 'AFTER');

  const photoSection = (title: string, category: WorkOrderPhoto['category'], items: WorkOrderPhoto[]) => <section className="panel">
    <div className="panelHeader"><h3>{title}</h3><span>{items.length}</span></div>
    <label>Add photo<input type="file" accept="image/*" capture="environment" disabled={uploading} onChange={(event) => void uploadPhoto(event, category)} /></label>
    <div className="dataList">
      {items.map((photo) => <article className="dataRow" key={photo.id}><div><img src={photo.url} alt={`${title} evidence`} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px' }} /><p>{photo.uploadedBy}<br />{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(photo.createdAt))}</p></div><button className="dangerButton" type="button" onClick={() => void removePhoto(photo)}>Remove</button></article>)}
      {!items.length ? <div className="emptyState"><strong>No {title.toLowerCase()} yet</strong></div> : null}
    </div>
  </section>;

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

      {photoSection('Before photos', 'BEFORE', beforePhotos)}
      {photoSection('After photos', 'AFTER', afterPhotos)}
    </div>
  </>;
}
