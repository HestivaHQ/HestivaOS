'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { accessEvidence, Incident, incidents, reviewIncident } from '../../../lib/work-order-incident-api';

export function IncidentAdminPanel({ workOrderId }: { workOrderId: string }) {
  const [items, setItems] = useState<Incident[]>([]);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const { data } = await createClient().auth.getSession();
    if (data.session) setItems(await incidents(workOrderId, data.session.access_token));
  }, [workOrderId]);
  useEffect(() => { void load(); }, [load]);

  async function viewEvidence(evidenceId: string) {
    try {
      const { data } = await createClient().auth.getSession();
      if (!data.session) return;
      const access = await accessEvidence(workOrderId, evidenceId, data.session.access_token);
      window.open(access.url, '_blank', 'noopener,noreferrer');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Evidence access failed.'); }
  }

  async function act(item: Incident, action: 'ACKNOWLEDGE' | 'RESOLVE' | 'REOPEN', resolution?: string) {
    try {
      const { data } = await createClient().auth.getSession();
      if (!data.session) return;
      await reviewIncident(workOrderId, item.id, data.session.access_token, { operationId: crypto.randomUUID(), action, resolution });
      await load(); setMessage('Incident review recorded.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Review failed.'); }
  }

  if (!items.length) return null;
  return <article id="incidents" className="executionChecklist"><h2>Field incidents</h2><p>Original reports and evidence remain unchanged. Resolution records operational follow-up only.</p>{items.map(item => <section key={item.id}><h3>{item.category.replaceAll('_', ' ')}</h3><p>{item.note}</p><p className="muted">{item.technician.firstName} {item.technician.lastName} · {new Date(item.fieldReportedAt).toLocaleString()}{item.section ? ` · ${item.section.title}` : ''} · {item.status.toLowerCase()}</p>{item.evidence.length ? <div><p>{item.evidence.length} linked evidence item(s) · private access expires after 60 seconds</p>{item.evidence.filter(evidence => evidence.syncState === 'SERVER_ACKNOWLEDGED').map(evidence => <button type="button" key={evidence.id} onClick={() => void viewEvidence(evidence.id)}>View private evidence</button>)}</div> : null}{item.reviews.map(review => <p key={review.id} className="muted">{new Date(review.createdAt).toLocaleString()} · {review.actor.firstName} {review.actor.lastName} · {review.action.toLowerCase()}{review.resolution ? ` · ${review.resolution.replaceAll('_', ' ').toLowerCase()}` : ''}</p>)}{item.status === 'OPEN' ? <button onClick={() => void act(item, 'ACKNOWLEDGE')}>Acknowledge</button> : null}{item.status !== 'RESOLVED' ? <label>Resolve operationally<select defaultValue="" onChange={event => event.target.value && void act(item, 'RESOLVE', event.target.value)}><option value="">Choose action</option><option value="NO_FURTHER_OPERATIONAL_ACTION">No further operational action</option><option value="FOLLOW_UP_COMPLETED">Follow-up completed</option><option value="ESCALATED_OUTSIDE_WORKFLOW">Escalated outside this workflow</option></select></label> : <button onClick={() => void act(item, 'REOPEN')}>Reopen for review</button>}</section>)}{message ? <p className="syncNotice">{message}</p> : null}</article>;
}
