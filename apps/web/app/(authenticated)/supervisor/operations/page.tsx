import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { AttentionPanel } from '../../../components/attention-panel';
const label=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const person=(value:{firstName:string;lastName:string})=>`${value.firstName} ${value.lastName}`.trim();

export default async function SupervisorOperationsPage(){
 const client=await createAuthenticatedApi(); const user=await client.currentUser();
 if(user.role!=='SUPERVISOR') redirect('/');
 const [operations,attention]=await Promise.all([client.supervisorOperations(),client.attention('mine')]);
 return <><div className="supervisorWorkspace v2Workspace">
  <header className="pageHeader"><div><p className="eyebrow">Supervisor workspace</p><h2>Operational review</h2><p>Exceptions and readiness from authoritative Work Order execution records.</p></div></header>
  <section><h3>Needs Attention</h3><AttentionPanel initial={attention}/></section>
  <section><div className="supervisorSectionHead"><div><h3>Active and today’s work</h3><p>Healthy work stays compact. Open a Work Order for authorized review actions.</p></div><span>{operations.workOrders.length} jobs</span></div>
   <div className="supervisorJobs">{operations.workOrders.map(job=>{const exceptions=[job.accessReadiness==='REQUIRED_MISSING'||job.accessReadiness==='NEEDS_REVIEW'?'Access needs review':null,job.completion.acknowledgementRequired?'Completion acknowledgement':null,job.incidents.length?`${job.incidents.length} incident${job.incidents.length===1?'':'s'}`:null,job.interruption.interrupted?'Interrupted visit':null,job.scopeMismatch.count?`${job.scopeMismatch.count} scope mismatch${job.scopeMismatch.count===1?'':'es'} · Admin resolution`:null,job.execution.evidencePendingCount?`${job.execution.evidencePendingCount} evidence upload pending`:null].filter(Boolean);return <details className={`supervisorJob ${exceptions.length?'exception':''}`} key={job.id}><summary><span><strong>{job.reference}</strong><small>{job.customerLabel} · {job.serviceName}</small></span><span className="supervisorBadges">{exceptions.length?exceptions.map(item=><em key={item}>{item}</em>):<em className="healthy">No projected exception</em>}</span></summary><div className="supervisorDetail"><dl><div><dt>Status</dt><dd>{label(job.status)}</dd></div><div><dt>Access</dt><dd>{label(job.accessReadiness)}</dd></div><div><dt>Assignment</dt><dd>{job.crewName||job.technicians.map(person).join(', ')||'Unassigned'}</dd></div><div><dt>Job Leader</dt><dd>{job.jobLeader?person(job.jobLeader):'Not assigned'}</dd></div><div><dt>Checklist</dt><dd>{job.execution.completedSections} / {job.execution.totalSections} outcomes</dd></div><div><dt>Evidence</dt><dd>{job.execution.evidenceCount} recorded · {job.execution.evidencePendingCount} pending</dd></div></dl><Link className="primaryButton" href={`/work-orders/${job.id}`}>Open Work Order review</Link></div></details>})}</div>
  </section>
 </div></>;
}
