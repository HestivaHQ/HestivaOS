import { InterruptedVisitBoundary } from '../../components/interrupted-visit-boundary';
import { JobBrief } from '../../components/job-brief';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><JobBrief id={id}/><InterruptedVisitBoundary id={id}/></>;}
