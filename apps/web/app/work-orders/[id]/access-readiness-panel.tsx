'use client';

import { useEffect, useState } from 'react';
import { api, WorkOrderAccessReadiness, WorkOrderAccessReadinessEvent } from '../../../lib/api';

const OPTIONS: Array<[WorkOrderAccessReadiness, string]> = [
  ['REQUIRED_MISSING', 'Required — missing'], ['RECEIVED', 'Received'], ['NEEDS_REVIEW', 'Needs review'],
  ['EXPIRED', 'Expired'], ['ARRANGED_ANOTHER_WAY', 'Arranged another way'], ['NOT_REQUIRED', 'Not required'],
];
const label = (value: WorkOrderAccessReadiness) => OPTIONS.find(([state]) => state === value)?.[1] ?? value;

export function AccessReadinessPanel({ workOrderId }: { workOrderId: string }) {
  const [state, setState] = useState<WorkOrderAccessReadiness>('NOT_REQUIRED'); const [draft, setDraft] = useState<WorkOrderAccessReadiness>('NOT_REQUIRED');
  const [history, setHistory] = useState<WorkOrderAccessReadinessEvent[]>([]);
  const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  async function loadHistory() { setHistory(await api.workOrderAccessReadinessHistory(workOrderId)); }
  useEffect(() => { void Promise.all([api.workOrder(workOrderId), loadHistory()]).then(([workOrder]) => { setState(workOrder.accessReadiness); setDraft(workOrder.accessReadiness); }).catch(() => setMessage('Unable to load access readiness.')); }, [workOrderId]);
  async function save() { setSaving(true); setMessage(''); try { const result = await api.updateWorkOrderAccessReadiness(workOrderId, draft); setState(result.accessReadiness); await loadHistory(); setMessage('Access readiness saved.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to save access readiness.'); } finally { setSaving(false); } }
  return <section className="panel resourceForm"><div className="panelHeader"><h3>Access readiness</h3><span className="statusPill">{label(state)}</span></div>
    <p>Visit-specific readiness only. Do not enter access codes, passwords, PINs, links, or credential files here.</p>
    <label>Readiness state<select value={draft} onChange={(event) => setDraft(event.target.value as WorkOrderAccessReadiness)}>{OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
    <button className="primaryButton" type="button" disabled={saving || draft === state} onClick={() => void save()}>{saving ? 'Saving…' : 'Save access readiness'}</button>{message ? <p role="status">{message}</p> : null}
    <details><summary>Readiness history ({history.length})</summary><div className="dataList">{history.map((event) => <article className="dataRow" key={event.id}><div><strong>{label(event.previousState)} → {label(event.newState)}</strong><p>{event.actor.displayName || `${event.actor.firstName} ${event.actor.lastName}`} · {new Date(event.createdAt).toLocaleString('en-ZA')}</p></div></article>)}</div></details>
  </section>;
}
