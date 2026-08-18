const rawApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type ScopeMismatchResolutionCode = 'NO_CHANGE_REQUIRED' | 'NON_CHARGEABLE_ADJUSTMENT' | 'CHARGEABLE_ADDITIONAL_WORK' | 'DECLINE_ADDITIONAL_WORK';
export type CustomerApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'DECLINED';
export type CustomerApprovalMethod = 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON' | 'OTHER';
export type ScopeMismatchResolution = { id:string; operationId:string; outcomeEventId:string; actorId:string; resolution:ScopeMismatchResolutionCode; customerApprovalStatus:CustomerApprovalStatus; customerApprovalMethod:CustomerApprovalMethod|null; customerApprovedAt:string|null; proposedAmountMinor:number|null; capacityReviewed:boolean; note:string|null; createdAt:string };
export type ScopeMismatch = { id:string; note:string|null; fieldRecordedAt:string; serverReceivedAt:string; technician:{id:string;firstName:string;lastName:string}; section:{id:string;stableKey:string;title:string;scopeRevisionId:string}; evidence:Array<{id:string;syncState:string;storagePath:string|null;capturedAt:string}>; resolutionHistory:ScopeMismatchResolution[]; latestResolution:ScopeMismatchResolution|null; additionalWorkMayBegin:boolean };
export type ScopeMismatchList = { workOrderId:string; reference:string|null; frozenScopeRevisionId:string|null; mismatches:ScopeMismatch[]; boundaries:Record<string,string> };

async function request<T>(token:string,path:string,init:RequestInit={}) {
  const response=await fetch(`${API_URL}/api/v1${path}`,{...init,headers:{Authorization:`Bearer ${token}`,...(init.body?{'Content-Type':'application/json'}:{}),...init.headers},cache:'no-store'});
  if(!response.ok){let message='Unable to process the scope mismatch.';try{const body=await response.json() as {message?:string|string[]};message=Array.isArray(body.message)?body.message.join(' '):body.message??message;}catch{}throw new Error(message)}
  return response.json() as Promise<T>;
}
export function listScopeMismatches(workOrderId:string,token:string){return request<ScopeMismatchList>(token,`/work-orders/${workOrderId}/scope-mismatches`)}
export function resolveScopeMismatch(workOrderId:string,eventId:string,token:string,input:{operationId:string;resolution:ScopeMismatchResolutionCode;customerApprovalStatus?:CustomerApprovalStatus;customerApprovalMethod?:CustomerApprovalMethod;customerApprovedAt?:string;proposedAmountMinor?:number;capacityReviewed?:boolean;note?:string}){return request<{resolution:ScopeMismatchResolution;replayed:boolean;additionalWorkMayBegin:boolean}>(token,`/work-orders/${workOrderId}/scope-mismatches/${eventId}/resolve`,{method:'POST',body:JSON.stringify(input)})}
