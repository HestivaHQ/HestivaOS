import { createClient } from './supabase/client';
import type { PendingInterruption } from '../app/technician/components/interruption-offline-store';

const rawApiUrl=process.env.API_URL??process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000';
const API_URL=rawApiUrl.trim().replace(/\/+$/,'').replace(/\/api\/v1$/,'');
type InterruptionResponse={id:string;serverAcceptedAt:string;replayed:boolean};
type ApiErrorBody={message?:string};
async function token(){const {data:{session}}=await createClient().auth.getSession();if(!session?.access_token)throw new Error('An authenticated Technician session is required.');return session.access_token;}
export async function interruptTechnicianJob(operation:PendingInterruption){const accessToken=await token();const response=await fetch(`${API_URL}/api/v1/technician/jobs/${operation.workOrderId}/interrupt`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({operationId:operation.operationId,scopeRevisionId:operation.scopeRevisionId,fieldInterruptedAt:operation.fieldInterruptedAt,expectedVersion:operation.expectedVersion,expectedStatus:operation.expectedStatus,reason:operation.reason,note:operation.note}),cache:'no-store'});const body=(await response.json().catch(()=>null)) as InterruptionResponse|ApiErrorBody|null;if(!response.ok){const message=body&&typeof body==='object'&&'message' in body&&typeof body.message==='string'?body.message:`Interruption sync failed (${response.status})`;const error=new Error(message) as Error&{status?:number};error.status=response.status;throw error;}return body as InterruptionResponse;}
