'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { InterruptionNextAction, routeWorkOrderInterruption, workOrderInterruption, InterruptionDetail } from '../../../lib/work-order-interruption-api';

const actions:Array<[InterruptionNextAction,string]>=[
  ['REPLACEMENT_VISIT','Create replacement visit (Phase 2D)'],
  ['FOLLOW_UP','Customer / operational follow-up'],
  ['PARTIAL_COMPLETION_REVIEW','Review partial completion'],
  ['FINANCIAL_REVIEW','Financial resolution required'],
  ['CLOSE','Close attempted visit'],
];
const reasonLabels:Record<string,string>={NO_ACCESS:'No access after attendance',UTILITIES_UNAVAILABLE:'Required utilities unavailable',SAFETY_CONCERN:'Safety concern',CUSTOMER_REQUESTED:'Customer requested interruption',REQUIRED_RESOURCE_UNAVAILABLE:'Required resource unavailable',OTHER:'Other'};
async function token(){const {data:{session}}=await createClient().auth.getSession();if(!session?.access_token)throw new Error('An authenticated management session is required.');return session.access_token;}

export function InterruptedVisitAdminPanel({workOrderId,canRoute}:{workOrderId:string;canRoute:boolean}){
  const [detail,setDetail]=useState<InterruptionDetail|null>(null),[action,setAction]=useState<InterruptionNextAction>('FOLLOW_UP'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const load=useCallback(async()=>{try{setDetail(await workOrderInterruption(workOrderId,await token()));}catch(error){setMessage(error instanceof Error?error.message:'Unable to load interruption review.');}},[workOrderId]);
  useEffect(()=>{void load();},[load]);
  if(!detail?.interruption)return null;
  async function route(){setBusy(true);setMessage('');try{await routeWorkOrderInterruption(workOrderId,await token(),{operationId:crypto.randomUUID(),nextAction:action,note:note.trim()||undefined});setMessage(action==='CLOSE'?'Interrupted visit closed.':'Next action recorded. The original attempted visit remains preserved.');setNote('');await load();}catch(error){setMessage(error instanceof Error?error.message:'Unable to record the next action.');}finally{setBusy(false);}}
  return <article className="executionChecklist"><h2>Interrupted visit review</h2><p><strong>{reasonLabels[detail.interruption.reason]??detail.interruption.reason}</strong><br/>{detail.interruption.note}</p><p>Field time: {new Date(detail.interruption.fieldInterruptedAt).toLocaleString()}</p>{detail.latestRoute?<p><strong>Latest route:</strong> {detail.latestRoute.nextAction.replaceAll('_',' ').toLowerCase()}{detail.latestRoute.note?` · ${detail.latestRoute.note}`:''}</p>:<p className="syncNotice">Management routing required.</p>}{detail.routes.length?<details><summary>Routing history ({detail.routes.length})</summary>{detail.routes.map(item=><p key={item.id}>{new Date(item.createdAt).toLocaleString()} · {item.nextAction.replaceAll('_',' ').toLowerCase()}{item.note?` · ${item.note}`:''}</p>)}</details>:null}{canRoute&&detail.status==='INTERRUPTED'?<><label>Next action<select value={action} onChange={e=>setAction(e.target.value as InterruptionNextAction)}>{actions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Management note<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} placeholder="Optional factual routing note" /></label><button type="button" disabled={busy} onClick={()=>void route()}>{busy?'Saving…':'Record next action'}</button></>:null}{action==='REPLACEMENT_VISIT'?<p className="syncNotice">This records the routing decision only. Phase 2D will create the linked replacement visit without moving this original attempt.</p>:null}{action==='FINANCIAL_REVIEW'?<p className="syncNotice">This flags financial review only. It does not create or change any charge, payment, credit or refund.</p>:null}{message?<p className="syncNotice">{message}</p>:null}</article>;
}
