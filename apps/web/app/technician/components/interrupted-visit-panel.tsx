'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TechnicianJob } from '../../../lib/api';
import { interruptTechnicianJob } from '../../../lib/technician-interruption-api';
import { interruptionForJob, InterruptionReason, PendingInterruption, saveInterruption } from './interruption-offline-store';

const reasons:Array<[InterruptionReason,string]>=[
  ['NO_ACCESS','No access after attendance'],
  ['UTILITIES_UNAVAILABLE','Required utilities unavailable'],
  ['SAFETY_CONCERN','Unsafe conditions'],
  ['CUSTOMER_REQUESTED','Customer requested interruption'],
  ['REQUIRED_RESOURCE_UNAVAILABLE','Required resource unavailable'],
  ['OTHER','Other'],
];
const interruptible=new Set(['TRAVELLING','ON_SITE','WAITING_FOR_PARTS']);

export function InterruptedVisitPanel({job,onLocalInterrupted}:{job:TechnicianJob;onLocalInterrupted:()=>void}){
  const [reason,setReason]=useState<InterruptionReason>('NO_ACCESS');
  const [note,setNote]=useState('');
  const [record,setRecord]=useState<PendingInterruption|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const reconcile=useCallback(async(op:PendingInterruption)=>{
    if(op.localSyncState!=='SYNC_PENDING'||!navigator.onLine)return;
    try{const ack=await interruptTechnicianJob(op);const next={...op,localSyncState:'ACKNOWLEDGED' as const,acknowledgedAt:ack.serverAcceptedAt,lastError:undefined};await saveInterruption(next);setRecord(next);setMessage('✓ Interrupted visit synced');}
    catch(error){const status=(error as Error&{status?:number}).status;if(status&&status>=400&&status<500){const next={...op,localSyncState:'NEEDS_REVIEW' as const,lastError:error instanceof Error?error.message:'Interruption needs review'};await saveInterruption(next);setRecord(next);setMessage('Interruption needs management/support review');}}
  },[]);

  useEffect(()=>{void (async()=>{const existing=await interruptionForJob(job.id);if(existing){setRecord(existing);onLocalInterrupted();await reconcile(existing);}})();},[job.id,onLocalInterrupted,reconcile]);
  useEffect(()=>{const online=()=>{if(record)void reconcile(record);};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[record,reconcile]);

  async function interrupt(){
    if(record||!job.executionScope||!job.isJobLeader||!interruptible.has(job.status)||note.trim().length<3)return;
    setBusy(true);const now=new Date().toISOString();
    const operation:PendingInterruption={kind:'INTERRUPT_JOB',workOrderId:job.id,operationId:crypto.randomUUID(),scopeRevisionId:job.executionScope.id,fieldInterruptedAt:now,expectedVersion:job.updatedAt,expectedStatus:job.status as PendingInterruption['expectedStatus'],reason,note:note.trim(),queuedAt:now,localSyncState:'SYNC_PENDING'};
    try{await saveInterruption(operation);setRecord(operation);onLocalInterrupted();setMessage('✓ Visit interrupted on this device · Sync pending');if(navigator.onLine)await reconcile(operation);}
    catch{setMessage('Could not safely save the interruption. The visit is not interrupted; try again.');}
    finally{setBusy(false);}
  }

  if(!job.isJobLeader)return null;
  if(record)return <article className="executionChecklist"><h2>Interrupted visit</h2><p><strong>{record.localSyncState==='ACKNOWLEDGED'?'✓ Visit interrupted':record.localSyncState==='NEEDS_REVIEW'?'Interruption needs review':'✓ Interrupted on this device · Sync pending'}</strong></p><p>{reasons.find(([value])=>value===record.reason)?.[1]??record.reason}</p><p>{record.note}</p>{record.lastError?<p className="syncNotice">{record.lastError}</p>:null}</article>;
  if(!interruptible.has(job.status))return null;
  return <article className="executionChecklist"><h2>Unable to complete this visit?</h2><p>Use this only when the visit was genuinely attempted but cannot continue. The original visit and field history will be preserved for management review.</p><label>Reason<select value={reason} onChange={e=>setReason(e.target.value as InterruptionReason)}>{reasons.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>What happened?<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} placeholder="Brief factual note" /></label><button type="button" disabled={busy||note.trim().length<3} onClick={()=>void interrupt()}>{busy?'Saving…':'Record interrupted visit'}</button>{message?<p className="syncNotice">{message}</p>:null}</article>;
}
