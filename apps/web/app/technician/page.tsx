import { TechnicianHome } from './components/technician-home';
export default async function TechnicianPage({ searchParams }:{searchParams:Promise<{view?:string}>}) { const {view='today'}=await searchParams; return <TechnicianHome initialView={view}/>; }
