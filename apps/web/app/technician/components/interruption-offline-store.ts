export type InterruptionReason = 'NO_ACCESS'|'UTILITIES_UNAVAILABLE'|'SAFETY_CONCERN'|'CUSTOMER_REQUESTED'|'REQUIRED_RESOURCE_UNAVAILABLE'|'OTHER';
export type PendingInterruption = {
  kind:'INTERRUPT_JOB'; workOrderId:string; operationId:string; scopeRevisionId:string;
  fieldInterruptedAt:string; expectedVersion:string; expectedStatus:'TRAVELLING'|'ON_SITE'|'WAITING_FOR_PARTS';
  reason:InterruptionReason; note:string; queuedAt:string;
  localSyncState:'SYNC_PENDING'|'ACKNOWLEDGED'|'NEEDS_REVIEW'; acknowledgedAt?:string; lastError?:string;
};
const DB='homent-technician',VERSION=4,STORE='operations';
function open(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DB,VERSION);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function all(){const db=await open();return new Promise<any[]>((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();});}
export async function saveInterruption(operation:PendingInterruption){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(operation);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});}
export async function interruptions(){return (await all()).filter(x=>x.kind==='INTERRUPT_JOB') as PendingInterruption[];}
export async function pendingInterruptions(){return (await interruptions()).filter(x=>x.localSyncState==='SYNC_PENDING');}
export async function interruptionForJob(workOrderId:string){return (await interruptions()).find(x=>x.workOrderId===workOrderId);}
