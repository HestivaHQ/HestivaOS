import type { SectionOutcomeOperation, StartJobOperation, TechnicianJob } from '../../../lib/api';
export type PendingStart = StartJobOperation & { workOrderId: string; kind: 'START_JOB'; queuedAt: string };
export type PendingOutcome=SectionOutcomeOperation&{kind:'SECTION_OUTCOME';queuedAt:string};
const DB = 'homent-technician'; const VERSION = 2;
function open() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(DB, VERSION); request.onupgradeneeded = () => { const db=request.result; if(!db.objectStoreNames.contains('jobs')) db.createObjectStore('jobs',{keyPath:'id'}); if(!db.objectStoreNames.contains('operations')) db.createObjectStore('operations',{keyPath:'operationId'}); }; request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); }
async function transaction<T>(storeName: 'jobs'|'operations', mode: IDBTransactionMode, run:(store:IDBObjectStore)=>IDBRequest<T>) { const db=await open(); return new Promise<T>((resolve,reject)=>{const tx=db.transaction(storeName,mode); const request=run(tx.objectStore(storeName)); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); tx.oncomplete=()=>db.close();}); }
export async function cacheJobs(jobs: TechnicianJob[]) { const db=await open(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction('jobs','readwrite'); for(const job of jobs) tx.objectStore('jobs').put(job); tx.oncomplete=()=>{db.close();resolve();}; tx.onerror=()=>reject(tx.error);}); }

export async function replaceAssignedCache(jobs: TechnicianJob[]) {
  const [existing, pending] = await Promise.all([cachedJobs(), pendingStarts()]);
  const keep = new Set([...jobs.map(job => job.id), ...pending.map(operation => operation.workOrderId)]);
  const db = await open();
  await new Promise<void>((resolve, reject) => { const tx=db.transaction('jobs','readwrite'); const store=tx.objectStore('jobs'); for(const job of existing) if(!keep.has(job.id)) store.delete(job.id); for(const job of jobs) store.put(job); tx.oncomplete=()=>{db.close();resolve();}; tx.onerror=()=>reject(tx.error); });
}

export const cachedJobs = () => transaction<TechnicianJob[]>('jobs','readonly',store=>store.getAll());
export const cachedJob = (id:string) => transaction<TechnicianJob|undefined>('jobs','readonly',store=>store.get(id));
export const savePendingStart = (operation:PendingStart) => transaction<IDBValidKey>('operations','readwrite',store=>store.add(operation));
export const pendingStarts = async () => (await transaction<Array<PendingStart|PendingOutcome>>('operations','readonly',store=>store.getAll())).filter(x=>x.kind==='START_JOB') as PendingStart[];
export const savePendingOutcome=(operation:PendingOutcome)=>transaction<IDBValidKey>('operations','readwrite',store=>store.add(operation));
export const pendingOutcomes=async()=>(await transaction<Array<PendingStart|PendingOutcome>>('operations','readonly',store=>store.getAll())).filter(x=>x.kind==='SECTION_OUTCOME') as PendingOutcome[];
export const removePendingStart = (id:string) => transaction<undefined>('operations','readwrite',store=>store.delete(id) as IDBRequest<undefined>);

export const removeCachedJob = (id:string) => transaction<undefined>('jobs','readwrite',store=>store.delete(id) as IDBRequest<undefined>);
