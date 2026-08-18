import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttentionActivityType, AttentionItemType, AttentionPriority, AttentionQueue, AttentionState, Prisma, TechnicianStatus, WorkOrderActivityType, WorkOrderStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';

export const interruptionReasons = ['NO_ACCESS', 'UTILITIES_UNAVAILABLE', 'SAFETY_CONCERN', 'CUSTOMER_REQUESTED', 'REQUIRED_RESOURCE_UNAVAILABLE', 'OTHER'] as const;
export type InterruptionReason = typeof interruptionReasons[number];
export const interruptionNextActions = ['REPLACEMENT_VISIT', 'FOLLOW_UP', 'PARTIAL_COMPLETION_REVIEW', 'FINANCIAL_REVIEW', 'CLOSE'] as const;
export type InterruptionNextAction = typeof interruptionNextActions[number];

export type InterruptJobInput = {
  operationId: string;
  scopeRevisionId: string;
  fieldInterruptedAt: string;
  expectedVersion: string;
  expectedStatus: 'TRAVELLING' | 'ON_SITE' | 'WAITING_FOR_PARTS';
  reason: InterruptionReason;
  note: string;
};
export type RouteInterruptionInput = { operationId: string; nextAction: InterruptionNextAction; note?: string };

type InterruptionRow = { id:string; operation_id:string; work_order_id:string; technician_id:string; scope_revision_id:string; field_interrupted_at:Date; reason:string; note:string; request_hash:string; server_accepted_at:Date };
type RouteRow = { id:string; operation_id:string; interruption_id:string; actor_id:string; next_action:string; note:string|null; request_hash:string; created_at:Date };
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_INTERRUPTION_STATUSES:WorkOrderStatus[]=[WorkOrderStatus.TRAVELLING,WorkOrderStatus.ON_SITE,WorkOrderStatus.WAITING_FOR_PARTS];

@Injectable()
export class WorkOrderInterruptionService {
  constructor(private readonly prisma:PrismaService){}

  private async technicianFor(userId:string){
    const record=await this.prisma.employeeRecord.findFirst({where:{userId,status:'ACTIVE',technician:{status:TechnicianStatus.ACTIVE}},select:{technicianId:true}});
    if(!record?.technicianId)throw new ForbiddenException('Technician access is not available for this account.');
    return record.technicianId;
  }

  async interrupt(userId:string,workOrderId:string,input:InterruptJobInput){
    const technicianId=await this.technicianFor(userId);
    if(!UUID.test(input.operationId??'')||!UUID.test(input.scopeRevisionId??''))throw new BadRequestException('Valid interruption operation and scope revision IDs are required.');
    if(!interruptionReasons.includes(input.reason))throw new BadRequestException('Choose a valid interruption reason.');
    const note=input.note?.trim();if(!note||note.length<3||note.length>1000)throw new BadRequestException('Add a factual interruption note between 3 and 1000 characters.');
    const fieldInterruptedAt=new Date(input.fieldInterruptedAt),expectedVersion=new Date(input.expectedVersion);
    if(!Number.isFinite(fieldInterruptedAt.getTime())||!Number.isFinite(expectedVersion.getTime())||fieldInterruptedAt.getTime()>Date.now()+5*60_000)throw new BadRequestException('Valid interruption timestamps are required.');
    if(!['TRAVELLING','ON_SITE','WAITING_FOR_PARTS'].includes(input.expectedStatus))throw new BadRequestException('This visit cannot be interrupted from the supplied state.');
    const request={workOrderId,scopeRevisionId:input.scopeRevisionId,fieldInterruptedAt:fieldInterruptedAt.toISOString(),expectedStatus:input.expectedStatus,reason:input.reason,note};
    const requestHash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const recovered=await this.findInterruptionByOperation(input.operationId);if(recovered)return this.recoverInterruption(recovered,workOrderId,requestHash);

    return this.prisma.$transaction(async tx=>{
      const duplicate=await this.findInterruptionByOperation(input.operationId,tx);if(duplicate)return this.recoverInterruption(duplicate,workOrderId,requestHash);
      const existing=await this.findInterruptionForWorkOrder(workOrderId,tx);if(existing)throw new ConflictException('This visit already has an authoritative interruption record.');
      const job=await tx.workOrder.findFirst({where:{id:workOrderId,assignedTechnicians:{some:{technicianId}}},select:{id:true,reference:true,title:true,status:true,updatedAt:true,jobLeaderId:true,startedScopeRevisionId:true,completionOperationId:true,customer:{select:{name:true,contactName:true}},service:{select:{name:true}},executionScopeRevisions:{orderBy:{revision:'desc'},take:1,select:{id:true}}}});
      if(!job)throw new NotFoundException('Assigned job was not found.');
      if(job.jobLeaderId!==technicianId)throw new ForbiddenException('Only the assigned Job Leader can interrupt this visit.');
      if(job.completionOperationId||job.status===WorkOrderStatus.COMPLETED)throw new ConflictException('A completed visit cannot be interrupted.');
      if(!ACTIVE_INTERRUPTION_STATUSES.includes(job.status)||job.status!==input.expectedStatus)throw new ConflictException('This visit cannot be interrupted from its current state.');
      if(job.updatedAt.getTime()!==expectedVersion.getTime())throw new ConflictException('The cached job changed. Refresh it before interrupting the visit.');
      const applicableScopeId=job.startedScopeRevisionId??job.executionScopeRevisions[0]?.id;
      if(!applicableScopeId||applicableScopeId!==input.scopeRevisionId)throw new ConflictException('The applicable Execution Scope changed. Review the latest job before interrupting.');

      const interruptionId=randomUUID();
      await tx.$executeRaw(Prisma.sql`INSERT INTO "work_order_interruptions" ("id","operation_id","work_order_id","technician_id","scope_revision_id","field_interrupted_at","reason","note","request_hash") VALUES (CAST(${interruptionId} AS UUID),CAST(${input.operationId} AS UUID),CAST(${workOrderId} AS UUID),CAST(${technicianId} AS UUID),CAST(${input.scopeRevisionId} AS UUID),${fieldInterruptedAt},${input.reason},${note},${requestHash})`);
      const changed=await tx.workOrder.updateMany({where:{id:workOrderId,status:job.status,updatedAt:job.updatedAt},data:{status:WorkOrderStatus.INTERRUPTED}});if(changed.count!==1)throw new ConflictException('The visit changed while the interruption was being saved.');
      await tx.workOrderActivity.create({data:{workOrderId,type:WorkOrderActivityType.STATUS_CHANGED,actorId:userId,previousStatus:job.status,newStatus:WorkOrderStatus.INTERRUPTED,note:`Interrupted visit: ${input.reason}. ${note}`}});
      const reference=job.reference??job.title,customer=job.customer.contactName?.trim()||job.customer.name,service=job.service?.name??'Cleaning service';
      await tx.attentionItem.upsert({where:{conditionKey:`work-order:${workOrderId}:interrupted-visit-review`},create:{conditionKey:`work-order:${workOrderId}:interrupted-visit-review`,type:AttentionItemType.INTERRUPTED_VISIT_REVIEW_REQUIRED,priority:input.reason==='SAFETY_CONCERN'?AttentionPriority.CRITICAL:AttentionPriority.HIGH,queue:AttentionQueue.MANAGEMENT_REVIEW,state:AttentionState.OPEN,subjectType:'WORK_ORDER',subjectId:workOrderId,subjectReference:reference,customerLabel:customer,title:'Interrupted visit needs review',summary:`${reference} · ${service} for ${customer} was interrupted in the field (${input.reason.replaceAll('_',' ').toLowerCase()}).`,actionLabel:'Review interrupted visit',actionHref:`/work-orders/${workOrderId}`,dueAt:null,openedAt:new Date(),lastObservedAt:new Date(),activities:{create:{type:AttentionActivityType.OPENED}}},update:{priority:input.reason==='SAFETY_CONCERN'?AttentionPriority.CRITICAL:AttentionPriority.HIGH,state:AttentionState.OPEN,resolvedAt:null,lastObservedAt:new Date(),title:'Interrupted visit needs review',summary:`${reference} · ${service} for ${customer} was interrupted in the field (${input.reason.replaceAll('_',' ').toLowerCase()}).`,actionLabel:'Review interrupted visit',actionHref:`/work-orders/${workOrderId}`}});
      const saved=await this.findInterruptionByOperation(input.operationId,tx);if(!saved)throw new ConflictException('Interruption audit record could not be recovered after commit.');
      return this.serializeInterruption(saved,false);
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  async detail(workOrderId:string){
    const job=await this.prisma.workOrder.findUnique({where:{id:workOrderId},select:{id:true,reference:true,status:true}});if(!job)throw new NotFoundException('Work Order not found.');
    const interruption=await this.findInterruptionForWorkOrder(workOrderId);if(!interruption)return{workOrderId,reference:job.reference,status:job.status,interruption:null,routes:[]};
    const routes=await this.routesFor(interruption.id);
    return{workOrderId,reference:job.reference,status:job.status,interruption:this.serializeInterruption(interruption,false),routes:routes.map(r=>this.serializeRoute(r,false)),latestRoute:routes.length?this.serializeRoute(routes.at(-1)!,false):null,boundaries:{replacement:'REPLACEMENT_VISIT routes the case to Phase 2D; it does not move the original visit date.',finance:'FINANCIAL_REVIEW records an operational routing need only; no payment, credit, charge or refund state is created.',correspondence:'No customer message is sent by the interruption workflow.'}};
  }

  async route(workOrderId:string,input:RouteInterruptionInput,actorId:string){
    if(!UUID.test(input.operationId??''))throw new BadRequestException('operationId must be a UUID generated once for this routing decision.');
    if(!interruptionNextActions.includes(input.nextAction))throw new BadRequestException('Choose a valid interruption next action.');
    const note=input.note?.trim()||null;if(note&&(note.length<3||note.length>1000))throw new BadRequestException('Routing note must be between 3 and 1000 characters.');
    const interruption=await this.findInterruptionForWorkOrder(workOrderId);if(!interruption)throw new NotFoundException('Interrupted visit record was not found.');
    const requestHash=createHash('sha256').update(JSON.stringify({workOrderId,interruptionId:interruption.id,nextAction:input.nextAction,note})).digest('hex');
    const recovered=await this.findRouteByOperation(input.operationId);if(recovered)return this.recoverRoute(recovered,interruption.id,requestHash);
    return this.prisma.$transaction(async tx=>{
      const duplicate=await this.findRouteByOperation(input.operationId,tx);if(duplicate)return this.recoverRoute(duplicate,interruption.id,requestHash);
      const job=await tx.workOrder.findUnique({where:{id:workOrderId},select:{status:true}});if(!job)throw new NotFoundException('Work Order not found.');
      if(job.status!==WorkOrderStatus.INTERRUPTED)throw new ConflictException('Only an interrupted visit can be routed through this workflow.');
      const routeId=randomUUID();
      await tx.$executeRaw(Prisma.sql`INSERT INTO "work_order_interruption_routes" ("id","operation_id","interruption_id","actor_id","next_action","note","request_hash") VALUES (CAST(${routeId} AS UUID),CAST(${input.operationId} AS UUID),CAST(${interruption.id} AS UUID),CAST(${actorId} AS UUID),${input.nextAction},${note},${requestHash})`);
      await tx.workOrderActivity.create({data:{workOrderId,type:WorkOrderActivityType.STATUS_CHANGED,actorId,note:`Interrupted visit routed to ${input.nextAction}.${note?` ${note}`:''}`}});
      if(input.nextAction==='CLOSE'){
        await tx.workOrder.update({where:{id:workOrderId},data:{status:WorkOrderStatus.CLOSED}});
        await tx.workOrderActivity.create({data:{workOrderId,type:WorkOrderActivityType.WORK_ORDER_CLOSED,actorId,previousStatus:WorkOrderStatus.INTERRUPTED,newStatus:WorkOrderStatus.CLOSED,note:'Interrupted visit closed after management review.'}});
        await tx.attentionItem.updateMany({where:{conditionKey:`work-order:${workOrderId}:interrupted-visit-review`,state:AttentionState.OPEN},data:{state:AttentionState.RESOLVED,resolvedAt:new Date(),lastObservedAt:new Date()}});
      }else{
        await tx.attentionItem.updateMany({where:{conditionKey:`work-order:${workOrderId}:interrupted-visit-review`,state:AttentionState.OPEN},data:{summary:`Interrupted visit routed to ${input.nextAction.replaceAll('_',' ').toLowerCase()}; follow-up remains required.`,lastObservedAt:new Date()}});
      }
      const saved=await this.findRouteByOperation(input.operationId,tx);if(!saved)throw new ConflictException('Interruption routing record could not be recovered after commit.');
      return this.serializeRoute(saved,false);
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  private async findInterruptionByOperation(operationId:string,db:PrismaService|Prisma.TransactionClient=this.prisma){const rows=await db.$queryRaw<InterruptionRow[]>(Prisma.sql`SELECT * FROM "work_order_interruptions" WHERE "operation_id"=CAST(${operationId} AS UUID) LIMIT 1`);return rows[0]??null;}
  private async findInterruptionForWorkOrder(workOrderId:string,db:PrismaService|Prisma.TransactionClient=this.prisma){const rows=await db.$queryRaw<InterruptionRow[]>(Prisma.sql`SELECT * FROM "work_order_interruptions" WHERE "work_order_id"=CAST(${workOrderId} AS UUID) LIMIT 1`);return rows[0]??null;}
  private async findRouteByOperation(operationId:string,db:PrismaService|Prisma.TransactionClient=this.prisma){const rows=await db.$queryRaw<RouteRow[]>(Prisma.sql`SELECT * FROM "work_order_interruption_routes" WHERE "operation_id"=CAST(${operationId} AS UUID) LIMIT 1`);return rows[0]??null;}
  private async routesFor(interruptionId:string){return this.prisma.$queryRaw<RouteRow[]>(Prisma.sql`SELECT * FROM "work_order_interruption_routes" WHERE "interruption_id"=CAST(${interruptionId} AS UUID) ORDER BY "created_at" ASC,"id" ASC`);}
  private recoverInterruption(row:InterruptionRow,workOrderId:string,hash:string){if(row.work_order_id!==workOrderId||row.request_hash!==hash)throw new ConflictException('Interruption operation ID is already bound to a different request.');return this.serializeInterruption(row,true);}
  private recoverRoute(row:RouteRow,interruptionId:string,hash:string){if(row.interruption_id!==interruptionId||row.request_hash!==hash)throw new ConflictException('Routing operation ID is already bound to a different request.');return this.serializeRoute(row,true);}
  private serializeInterruption(r:InterruptionRow,replayed:boolean){return{id:r.id,operationId:r.operation_id,workOrderId:r.work_order_id,technicianId:r.technician_id,scopeRevisionId:r.scope_revision_id,fieldInterruptedAt:r.field_interrupted_at.toISOString(),reason:r.reason,note:r.note,serverAcceptedAt:r.server_accepted_at.toISOString(),replayed};}
  private serializeRoute(r:RouteRow,replayed:boolean){return{id:r.id,operationId:r.operation_id,interruptionId:r.interruption_id,actorId:r.actor_id,nextAction:r.next_action,note:r.note,createdAt:r.created_at.toISOString(),replayed};}
}
