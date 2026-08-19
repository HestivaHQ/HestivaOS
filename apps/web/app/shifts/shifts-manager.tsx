'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { workOrderDisplayLabel, workOrderReference } from '../../lib/work-order-display';
import { api, Crew, Shift, ShiftInput, ShiftStatus, Technician, WorkOrder } from '../../lib/api';

type ShiftForm = {
  title: string;
  startAt: string;
  endAt: string;
  unpaidBreakMinutes: string;
  crewId: string;
  technicianId: string;
  workOrderId: string;
  location: string;
  notes: string;
  status: ShiftStatus;
};

const emptyForm: ShiftForm = {
  title: '', startAt: '', endAt: '', unpaidBreakMinutes: '0', crewId: '', technicianId: '', workOrderId: '', location: '', notes: '', status: 'DRAFT',
};

function localInput(value: string) { return new Date(value).toISOString().slice(0, 16); }
function readable(value: string) { return value.replaceAll('_', ' '); }
function mergeSelected<T extends { id: string }>(items: T[], selected?: T | null) {
  return selected && !items.some((item) => item.id === selected.id) ? [selected, ...items] : items;
}

export function ShiftsManager() {
  const [items, setItems] = useState<Shift[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [form, setForm] = useState<ShiftForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [crewSearch, setCrewSearch] = useState('');
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(() => { const date = new Date(); date.setDate(date.getDate() - date.getDay() + 1); return date.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => { const date = new Date(); date.setDate(date.getDate() - date.getDay() + 7); return date.toISOString().slice(0, 10); });

  const selectedCrew = useMemo(() => crews.find((crew) => crew.id === form.crewId), [crews, form.crewId]);
  const availableTechnicians = useMemo(() => selectedCrew ? selectedCrew.members.map((member) => member.technician) : technicians, [selectedCrew, technicians]);

  async function loadShifts() {
    try {
      const query = `?page=1&pageSize=100&dateFrom=${encodeURIComponent(`${dateFrom}T00:00:00`)}&dateTo=${encodeURIComponent(`${dateTo}T23:59:59`)}`;
      setItems((await api.shifts(query)).items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load shifts.'); }
  }

  useEffect(() => { void loadShifts(); }, [dateFrom, dateTo]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void api.crews(`?page=1&pageSize=20&status=ACTIVE${crewSearch.trim() ? `&search=${encodeURIComponent(crewSearch.trim())}` : ''}`)
        .then((data) => setCrews((current) => mergeSelected(data.items, current.find((crew) => crew.id === form.crewId))))
        .catch((err) => setError(err instanceof Error ? err.message : 'Unable to search crews.'));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [crewSearch, form.crewId]);
  useEffect(() => {
    if (selectedCrew) return;
    const timer = window.setTimeout(() => {
      void api.technicians(`?page=1&pageSize=20&status=ACTIVE${technicianSearch.trim() ? `&search=${encodeURIComponent(technicianSearch.trim())}` : ''}`)
        .then((data) => setTechnicians((current) => mergeSelected(data.items, current.find((technician) => technician.id === form.technicianId))))
        .catch((err) => setError(err instanceof Error ? err.message : 'Unable to search technicians.'));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.technicianId, selectedCrew, technicianSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void api.workOrders(`?page=1&pageSize=20${workOrderSearch.trim() ? `&search=${encodeURIComponent(workOrderSearch.trim())}` : ''}`)
        .then((data) => setWorkOrders((current) => mergeSelected(data.items, current.find((workOrder) => workOrder.id === form.workOrderId))))
        .catch((err) => setError(err instanceof Error ? err.message : 'Unable to search work orders.'));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.workOrderId, workOrderSearch]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload: ShiftInput = {
        title: form.title,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        unpaidBreakMinutes: Number(form.unpaidBreakMinutes || 0),
        crewId: form.crewId || null,
        technicianId: form.technicianId || null,
        workOrderId: form.workOrderId || null,
        location: form.location,
        notes: form.notes,
        status: form.status,
      };
      if (editingId) await api.updateShift(editingId, payload);
      else await api.createShift(payload);
      setForm(emptyForm);
      setEditingId(null);
      await loadShifts();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save shift.'); }
    finally { setBusy(false); }
  }

  function edit(shift: Shift) {
    setEditingId(shift.id);
    setCrews((current) => mergeSelected(current, shift.crew));
    setTechnicians((current) => mergeSelected(current, shift.technician));
    setWorkOrders((current) => mergeSelected(current, shift.workOrder));
    setForm({
      title: shift.title,
      startAt: localInput(shift.startAt),
      endAt: localInput(shift.endAt),
      unpaidBreakMinutes: String(shift.unpaidBreakMinutes),
      crewId: shift.crewId ?? '',
      technicianId: shift.technicianId ?? '',
      workOrderId: shift.workOrderId ?? '',
      location: shift.location ?? '',
      notes: shift.notes ?? '',
      status: shift.status,
    });
  }

  async function copy(shift: Shift) {
    const targetDate = window.prompt('Copy shift to date (YYYY-MM-DD):');
    if (!targetDate) return;
    const start = new Date(shift.startAt);
    const end = new Date(shift.endAt);
    const copiedStart = new Date(`${targetDate}T${start.toISOString().slice(11, 19)}`);
    const copiedEnd = new Date(`${targetDate}T${end.toISOString().slice(11, 19)}`);
    try { await api.copyShift(shift.id, { startAt: copiedStart.toISOString(), endAt: copiedEnd.toISOString() }); await loadShifts(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to copy shift.'); }
  }

  async function remove(shift: Shift) {
    if (!window.confirm(`Delete shift "${shift.title}"?`)) return;
    try { await api.deleteShift(shift.id); await loadShifts(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete shift.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Staff operations</p><h2>Shift planning</h2><p>Plan crew and technician working times, breaks, work-order links, and weekly coverage.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit shift' : 'New shift'}</h3></div>
        <label>Shift title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Start<input required type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></label>
        <label>End<input required type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label>
        <label>Unpaid break (minutes)<input min="0" type="number" value={form.unpaidBreakMinutes} onChange={(event) => setForm({ ...form, unpaidBreakMinutes: event.target.value })} /></label>
        <label>Search crews<input type="search" value={crewSearch} onChange={(event) => setCrewSearch(event.target.value)} placeholder="Crew or technician name" /></label>
        <label>Crew<select value={form.crewId} onChange={(event) => { setTechnicianSearch(''); setForm({ ...form, crewId: event.target.value, technicianId: '' }); }}><option value="">No crew</option>{crews.filter((crew) => crew.status === 'ACTIVE' || crew.id === form.crewId).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}{crew.status === 'INACTIVE' ? ' (inactive, historical)' : ''}</option>)}</select></label>
        {!selectedCrew ? <label>Search technicians<input type="search" value={technicianSearch} onChange={(event) => setTechnicianSearch(event.target.value)} placeholder="Name, email or phone" /></label> : null}
        <label>{selectedCrew ? 'Designated technician' : 'Technician'}<select value={form.technicianId} onChange={(event) => setForm({ ...form, technicianId: event.target.value })}><option value="">{selectedCrew ? 'Whole crew' : 'Select technician'}</option>{availableTechnicians.filter((technician) => technician.status === 'ACTIVE' || technician.id === form.technicianId).map((technician) => <option key={technician.id} value={technician.id}>{technician.firstName} {technician.lastName}</option>)}</select></label>
        <label>Search work orders<input type="search" value={workOrderSearch} onChange={(event) => setWorkOrderSearch(event.target.value)} placeholder="Reference, customer, property or service" /></label>
        <label>Work order<select value={form.workOrderId} onChange={(event) => setForm({ ...form, workOrderId: event.target.value })}><option value="">No linked work order</option>{workOrders.map((workOrder) => <option key={workOrder.id} value={workOrder.id}>{workOrderReference(workOrder)} · {workOrderDisplayLabel(workOrder)}</option>)}</select></label>
        <label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ShiftStatus })}>{['DRAFT','SCHEDULED','CONFIRMED','COMPLETED','CANCELLED'].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Management notes<textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <div className="formActions"><button className="primaryButton" disabled={busy}>{busy ? 'Saving…' : 'Save shift'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>

      <section className="panel">
        <div className="panelHeader"><h3>Shift calendar</h3><div className="rowActions"><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div></div>
        <div className="dataList">
          {items.map((shift) => <article className="dataRow" key={shift.id}><div><strong>{shift.title}</strong><p>{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(shift.startAt))} – {new Intl.DateTimeFormat('en-ZA', { timeStyle: 'short' }).format(new Date(shift.endAt))}</p><p>{shift.crew?.name || (shift.technician ? `${shift.technician.firstName} ${shift.technician.lastName}` : 'Unassigned')} · {shift.plannedHours} planned hours{shift.unpaidBreakMinutes ? ` · ${shift.unpaidBreakMinutes} min unpaid break` : ''}</p>{shift.workOrder ? <p>{workOrderReference(shift.workOrder)} · {workOrderDisplayLabel(shift.workOrder)}</p> : null}</div><div className="rowActions"><span className="statusPill">{readable(shift.status)}</span><button onClick={() => edit(shift)}>Edit</button><button onClick={() => void copy(shift)}>Copy</button><button className="dangerButton" onClick={() => void remove(shift)}>Delete</button></div></article>)}
          {!items.length ? <div className="emptyState"><strong>No shifts scheduled</strong><p>Create the first crew or technician shift for this date range.</p></div> : null}
        </div>
      </section>
    </div>
  </>;
}
