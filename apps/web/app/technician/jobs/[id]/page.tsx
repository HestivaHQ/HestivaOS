import { JobBrief } from '../../components/job-brief';
export default async function Page({params}:{params:Promise<{id:string}>}){return <JobBrief id={(await params).id}/>;}
