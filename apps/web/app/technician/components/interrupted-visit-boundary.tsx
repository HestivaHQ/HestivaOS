'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { technicianApi, TechnicianJob } from '../../../lib/api';
import { cachedJob } from './offline-store';
import { interruptionForJob } from './interruption-offline-store';
import { InterruptedVisitPanel } from './interrupted-visit-panel';

export function InterruptedVisitBoundary({id}:{id:string}){
  const [job,setJob]=useState<TechnicianJob|null>(null);
  const [locked,setLocked]=useState(false);
  useEffect(()=>{void (async()=>{const [localRecord,cached]=await Promise.all([interruptionForJob(id),cachedJob(id)]);if(localRecord)setLocked(true);try{const fresh=await technicianApi.job(id);setJob(fresh);if((fresh.status as string)==='INTERRUPTED')setLocked(true);}catch{if(cached){setJob(cached);if((cached.status as string)==='INTERRUPTED')setLocked(true);}}})();},[id]);
  if(!job)return null;
  const panel=<InterruptedVisitPanel job={job} onLocalInterrupted={()=>setLocked(true)} />;
  if(!locked)return panel;
  return <div style={{position:'fixed',inset:0,zIndex:1000,overflow:'auto',background:'var(--background, #fff)',padding:'1.25rem'}}><section className="technicianPage jobBrief"><Link href="/technician">← Assigned jobs</Link><div className="technicianHeading"><p className="eyebrow">Visit interrupted</p><h1>{job.service?.name??job.title}</h1></div><p className="syncNotice"><strong>This attempted visit is now read-only on this device.</strong> Management will review the recorded reason and choose the next action. Do not reopen, reschedule or complete the original visit.</p>{panel}</section></div>;
}
