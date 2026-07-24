'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, Shift } from '../../lib/api';
import { AdjustmentDefinition, LabourWorker, labourCostingApi, ShiftCost, TechnicianRate } from '../../lib/labour-costing-api';

type RateForm = { technicianId: string; payType: 'DAILY' | 'HOURLY'; dailyRate: string; hourlyRate: string; standardHoursPerDay: string; overtimeMultiplier: string; weekendMultiplier: string; publicHolidayMultiplier: string; effectiveFrom: string; effectiveTo: string; reason: string };
type DefinitionForm = { name: string; kind: 'ALLOWANCE' | 'DEDUCTION'; calculation: 'FIXED' | 'PER_HOUR' | 'PER_DAY'; amount: string; notes: string };
const emptyRate: RateForm = { technicianId: '', payType: 'DAILY', dailyRate: '', hourlyRate: '', standardHoursPerDay: '8', overtimeMultiplier: '1.5', weekendMultiplier: '1', publicHolidayMultiplier: '1', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: '', reason: '' };
const emptyDefinition: DefinitionForm = { name: '', kind: 'ALLOWANCE', calculation: 'FIXED', amount: '', notes: '' };
const money = (value: number | null | undefined) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value ?? 0);

export function LabourCostingManager() {
  const [workers, setWorkers] = useState<LabourWorker[]>([]);
  const [definitions, setDefinitions] = useState<AdjustmentDefinition[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [rateForm, setRateForm] = useState<RateForm>(emptyRate);
  const [definitionForm, setDefinitionForm] = useState<DefinitionForm>(emptyDefinition);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [shiftCost, setShiftCost] = useState<ShiftCost | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedWorker = useMemo(() => workers.find((worker) => worker.id === rateForm.technicianId), [workers, rateForm.technicianId]);

  async function load() {
    try {
      const [workerData, definitionData, shiftData] = await Promise.all([
        labourCostingApi.workers(), labourCostingApi.definitions(), api.shifts('?page=1&pageSize=100'),
      ]);
      setWorkers(workerData);
      setDefinitions(definitionData);
      setShifts(shiftData.items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load labour costing.'); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (selectedShiftId) void labourCostingApi.shiftCost(selectedShiftId).then(setShiftCost).catch((err) => setError(err instanceof Error ? err.message : 'Unable to calculate shift cost.')); else setShiftCost(null); }, [selectedShiftId]);

  async function saveRate(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await labourCostingApi.createRate(rateForm.technicianId, {
        payType: rateForm.payType,
        dailyRate: rateForm.payType === 'DAILY' ? Number(rateForm.dailyRate) : null,
        hourlyRate: rateForm.payType === 'HOURLY' ? Number(rateForm.hourlyRate) : null,
        standardHoursPerDay: Number(rateForm.standardHoursPerDay),
        overtimeMultiplier: Number(rateForm.overtimeMultiplier),
        weekendMultiplier: Number(rateForm.weekendMultiplier),
        publicHolidayMultiplier: Number(rateForm.publicHolidayMultiplier),
        effectiveFrom: new Date(`${rateForm.effectiveFrom}T00:00:00`).toISOString(),
        effectiveTo: rateForm.effectiveTo ? new Date(`${rateForm.effectiveTo}T23:59:59`).toISOString() : null,
        reason: rateForm.reason || null,
      } as Omit<TechnicianRate, 'id' | 'technicianId' | 'calculatedHourlyRate' | 'createdAt'>);
      setRateForm(emptyRate); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save rate.'); }
    finally { setBusy(false); }
  }

  async function saveDefinition(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await labourCostingApi.createDefinition({ ...definitionForm, amount: Number(definitionForm.amount), isActive: true });
      setDefinitionForm(emptyDefinition); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save adjustment.'); }
    finally { setBusy(false); }
  }

  async function addAdjustment(technicianId: string, definitionId: string) {
    if (!selectedShiftId || !definitionId) return;
    try { await labourCostingApi.addShiftAdjustment(selectedShiftId, { technicianId, definitionId }); setShiftCost(await labourCostingApi.shiftCost(selectedShiftId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to add adjustment.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Management portal</p><h2>Worker rates & labour costing</h2><p>Manage effective pay rates, overtime rules, allowances, deductions, and planned shift labour cost.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={saveRate}>
        <div className="panelHeader"><h3>Add worker rate</h3></div>
        <label>Worker<select required value={rateForm.technicianId} onChange={(event) => setRateForm({ ...rateForm, technicianId: event.target.value })}><option value="">Select worker</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.firstName} {worker.lastName}</option>)}</select></label>
        <label>Pay type<select value={rateForm.payType} onChange={(event) => setRateForm({ ...rateForm, payType: event.target.value as RateForm['payType'] })}><option value="DAILY">Daily rate</option><option value="HOURLY">Hourly rate</option></select></label>
        {rateForm.payType === 'DAILY' ? <label>Daily rate (R)<input required min="0" step="0.01" type="number" value={rateForm.dailyRate} onChange={(event) => setRateForm({ ...rateForm, dailyRate: event.target.value })} /></label> : <label>Hourly rate (R)<input required min="0" step="0.01" type="number" value={rateForm.hourlyRate} onChange={(event) => setRateForm({ ...rateForm, hourlyRate: event.target.value })} /></label>}
        <label>Standard hours per day<input required min="0.25" step="0.25" type="number" value={rateForm.standardHoursPerDay} onChange={(event) => setRateForm({ ...rateForm, standardHoursPerDay: event.target.value })} /></label>
        <label>Overtime multiplier<input required min="1" step="0.1" type="number" value={rateForm.overtimeMultiplier} onChange={(event) => setRateForm({ ...rateForm, overtimeMultiplier: event.target.value })} /></label>
        <label>Weekend multiplier<input required min="0" step="0.1" type="number" value={rateForm.weekendMultiplier} onChange={(event) => setRateForm({ ...rateForm, weekendMultiplier: event.target.value })} /></label>
        <label>Public-holiday multiplier<input required min="0" step="0.1" type="number" value={rateForm.publicHolidayMultiplier} onChange={(event) => setRateForm({ ...rateForm, publicHolidayMultiplier: event.target.value })} /></label>
        <label>Effective from<input required type="date" value={rateForm.effectiveFrom} onChange={(event) => setRateForm({ ...rateForm, effectiveFrom: event.target.value })} /></label>
        <label>Effective to<input type="date" value={rateForm.effectiveTo} onChange={(event) => setRateForm({ ...rateForm, effectiveTo: event.target.value })} /></label>
        <label>Reason<textarea rows={3} value={rateForm.reason} onChange={(event) => setRateForm({ ...rateForm, reason: event.target.value })} /></label>
        {selectedWorker?.activeRate ? <p>Current calculated hourly rate: <strong>{money(selectedWorker.activeRate.calculatedHourlyRate)}</strong></p> : null}
        <button className="primaryButton" disabled={busy}>Save rate</button>
      </form>

      <section className="panel"><div className="panelHeader"><h3>Current worker rates</h3></div><div className="dataList">
        {workers.map((worker) => <article className="dataRow" key={worker.id}><div><strong>{worker.firstName} {worker.lastName}</strong><p>{worker.activeRate ? `${worker.activeRate.payType} · ${money(worker.activeRate.payType === 'DAILY' ? worker.activeRate.dailyRate : worker.activeRate.hourlyRate)} · ${money(worker.activeRate.calculatedHourlyRate)}/hour` : 'No active rate configured'}</p><p>{worker.activeRate ? `${worker.activeRate.standardHoursPerDay} standard hours · ${worker.activeRate.overtimeMultiplier}× overtime` : ''}</p></div></article>)}
      </div></section>
    </div>

    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={saveDefinition}><div className="panelHeader"><h3>Add allowance or deduction</h3></div>
        <label>Name<input required value={definitionForm.name} onChange={(event) => setDefinitionForm({ ...definitionForm, name: event.target.value })} /></label>
        <label>Type<select value={definitionForm.kind} onChange={(event) => setDefinitionForm({ ...definitionForm, kind: event.target.value as DefinitionForm['kind'] })}><option value="ALLOWANCE">Allowance</option><option value="DEDUCTION">Deduction</option></select></label>
        <label>Calculation<select value={definitionForm.calculation} onChange={(event) => setDefinitionForm({ ...definitionForm, calculation: event.target.value as DefinitionForm['calculation'] })}><option value="FIXED">Fixed amount</option><option value="PER_HOUR">Per hour</option><option value="PER_DAY">Per day</option></select></label>
        <label>Amount (R)<input required min="0" step="0.01" type="number" value={definitionForm.amount} onChange={(event) => setDefinitionForm({ ...definitionForm, amount: event.target.value })} /></label>
        <label>Notes<textarea rows={3} value={definitionForm.notes} onChange={(event) => setDefinitionForm({ ...definitionForm, notes: event.target.value })} /></label>
        <button className="primaryButton" disabled={busy}>Save adjustment</button>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Adjustment catalogue</h3></div><div className="dataList">{definitions.map((definition) => <article className="dataRow" key={definition.id}><div><strong>{definition.name}</strong><p>{definition.kind} · {definition.calculation.replaceAll('_', ' ')} · {money(definition.amount)}</p></div><button onClick={() => void labourCostingApi.updateDefinition(definition.id, { isActive: !definition.isActive }).then(load)}>{definition.isActive ? 'Deactivate' : 'Activate'}</button></article>)}</div></section>
    </div>

    <section className="panel"><div className="panelHeader"><h3>Planned shift labour cost</h3><select value={selectedShiftId} onChange={(event) => setSelectedShiftId(event.target.value)}><option value="">Select shift</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.title} · {new Date(shift.startAt).toLocaleDateString('en-ZA')}</option>)}</select></div>
      {shiftCost ? <><p><strong>Total planned labour cost: {money(shiftCost.totalLabourCost)}</strong> · {shiftCost.plannedHours} planned hours</p><div className="dataList">{shiftCost.workers.map((row) => <article className="dataRow" key={row.technician.id}><div><strong>{row.technician.firstName} {row.technician.lastName}</strong><p>{row.warning || `${money(row.derivedHourlyRate)}/hour · Base ${money(row.baseCost)} · Overtime ${money(row.overtimeCost)} · Total ${money(row.totalCost)}`}</p>{row.adjustments.map((adjustment) => <p key={adjustment.id}>{adjustment.definition.name}: {money(adjustment.calculatedAmount)}</p>)}</div><select defaultValue="" onChange={(event) => { void addAdjustment(row.technician.id, event.target.value); event.currentTarget.value = ''; }}><option value="">Add adjustment</option>{definitions.filter((definition) => definition.isActive).map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></article>)}</div></> : <p className="emptyState">Select a shift to calculate planned labour cost.</p>}
    </section>
  </>;
}