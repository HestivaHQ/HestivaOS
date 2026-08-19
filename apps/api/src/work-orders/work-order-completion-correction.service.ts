import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ExecutionAttentionLevel, ExecutionExceptionReason, ExecutionSectionOutcome, Prisma, WorkOrderCompletionCorrectionStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export type AuthorizeCompletionCorrectionInput={operationId:string;reason:string;sectionIds:string[]};
export type CorrectedOutcomeInput={operationId:string;correctionId:string;scopeRevisionId:string;outcome:ExecutionSectionOutcome;reason?:ExecutionExceptionReason;note?:string;fieldRecordedAt:string;expectedSectionVersion:number;evidence?:Array<{localEvidenceId:string;capturedAt:string;syncState?:'CAPTURED_LOCAL'|'QUEUED'|'RETRY_PENDING'}>};
export type ResubmitCompletionCorrectionInput={operationId:string;correctionId:string;fieldResubmittedAt:string};

@Injectable()
export class WorkOrderCompletionCorrectionService{
 constructor(private readonly prisma:PrismaService){}
 async history(workOrderId:string){
  const exists=await this.prisma.workOrder.findUnique({where:{id:workOrderId},select:{id:true}});if(!exists)throw new NotFoundException('Work Order not found.');
  return this.prisma.workOrderCompletionCorrection.findMany({where:{workOrderId},include:{authorizedBy:{select:{id:true,firstName:true,lastName:true}},technician:{select:{id:true,firstName:true,lastName:true}},correctedOutcomes:{include:{section:{select:{id:true,stableKey:true,title:true}}},orderBy:{serverReceivedAt:'asc'}}},orderBy:{createdAt:'asc'}});
 }
 async authorize(workOrderId:string,input:AuthorizeCompletionCorrectionInput,actorId:string){
  if(!UUID.test(input.operationId))throw new BadRequestException('A valid operation ID is required.');
  const reason=input.reason?.trim();if(!reason||reason.length<5||reason.length>500)throw new BadRequestException('A concise factual reason of 5 to 500 characters is required.');
  const sectionIds=[...new Set(input.sectionIds??[])].sort();if(!sectionIds.length||sectionIds.some(id=>!UUID.test(id)))throw new BadRequestException('Choose at least one valid frozen-scope section.');
  const requestHash=hash({workOrderId,reason,sectionIds});
  return this.prisma.$transaction(async tx=>{
   const replay=await tx.workOrderCompletionCorrection.findUnique({where:{authorizationOperationId:input.operationId}});if(replay){if(replay.authorizationRequestHash!==requestHash)throw new ConflictException('This operation ID was already used for another authorization.');return replay;}
   const job=await tx.workOrder.findUnique({where:{id:workOrderId},select:{status:true,startedScopeRevisionId:true,completionOperationId:true,completedByTechnicianId:true,fieldCompletedAt:true,completionAcceptedAt:true,completionAcknowledgedAt:true,completionAcknowledgedById:true,completionCorrespondenceEligibleAt:true,startedScopeRevision:{select:{sections:{select:{id:true}}}},completionCorrections:{where:{status:{in:[WorkOrderCompletionCorrectionStatus.AUTHORIZED,WorkOrderCompletionCorrectionStatus.IN_PROGRESS]}},select:{id:true}}}});
   if(!job)throw new NotFoundException('Work Order not found.');if(job.status!==WorkOrderStatus.COMPLETED||!job.completionOperationId||!job.completedByTechnicianId||!job.fieldCompletedAt||!job.completionAcceptedAt)throw new ConflictException('Only an authoritative completed Technician execution can be corrected.');
   if(job.completionCorrections.length)throw new ConflictException('This Work Order already has an active correction.');
   const frozen=new Set(job.startedScopeRevision?.sections.map(s=>s.id)??[]);if(sectionIds.some(id=>!frozen.has(id)))throw new BadRequestException('Every affected section must belong to the frozen Execution Scope.');
   return tx.workOrderCompletionCorrection.create({data:{authorizationOperationId:input.operationId,authorizationRequestHash:requestHash,workOrderId,technicianId:job.completedByTechnicianId,authorizedById:actorId,reason,affectedSectionIds:sectionIds,originalCompletionOperationId:job.completionOperationId,originalFieldCompletedAt:job.fieldCompletedAt,originalCompletionAcceptedAt:job.completionAcceptedAt,priorAcknowledgedAt:job.completionAcknowledgedAt,priorAcknowledgedById:job.completionAcknowledgedById,priorCorrespondenceEligibleAt:job.completionCorrespondenceEligibleAt}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 private async technician(tx:Prisma.TransactionClient,userId:string){const record=await tx.employeeRecord.findFirst({where:{userId,status:'ACTIVE',technician:{status:'ACTIVE'}},select:{technicianId:true}});if(!record?.technicianId)throw new ForbiddenException('Technician access is not available for this account.');return record.technicianId;}
 async record(userId:string,workOrderId:string,sectionId:string,input:CorrectedOutcomeInput){
  if(!UUID.test(input.operationId)||!UUID.test(input.correctionId))throw new BadRequestException('Valid correction and operation IDs are required.');
  if(input.outcome==='NOT_COMPLETED'&&(!input.reason||!input.note?.trim()))throw new BadRequestException('Choose a reason and add a short note.');
  const at=new Date(input.fieldRecordedAt);if(!Number.isFinite(at.getTime()))throw new BadRequestException('A valid field timestamp is required.');
  return this.prisma.$transaction(async tx=>{
   const technicianId=await this.technician(tx,userId);const duplicate=await tx.executionSectionOutcomeEvent.findUnique({where:{operationId:input.operationId}});
   if(duplicate){if(duplicate.correctionId!==input.correctionId||duplicate.sectionId!==sectionId||duplicate.technicianId!==technicianId||duplicate.outcome!==input.outcome||duplicate.reason!==(input.reason??null)||duplicate.note!==(input.note?.trim()||null))throw new ConflictException('This operation ID was already used for another outcome.');return duplicate;}
   const correction=await tx.workOrderCompletionCorrection.findFirst({where:{id:input.correctionId,workOrderId,status:{in:['AUTHORIZED','IN_PROGRESS']}},select:{id:true,technicianId:true,affectedSectionIds:true,priorAcknowledgedAt:true,firstCorrectedAt:true}});if(!correction)throw new ConflictException('No active correction authorization was found.');if(correction.technicianId!==technicianId)throw new ForbiddenException('Only the Technician whose completion is being corrected may submit it.');if(!correction.affectedSectionIds.includes(sectionId))throw new ForbiddenException('This section is outside the authorized correction scope.');
   const section=await tx.workOrderExecutionSection.findFirst({where:{id:sectionId,scopeRevisionId:input.scopeRevisionId,scopeRevision:{workOrderId,workOrder:{status:'COMPLETED',startedScopeRevisionId:input.scopeRevisionId,assignedTechnicians:{some:{technicianId}}}}}});if(!section)throw new NotFoundException('Assigned frozen-scope section was not found.');if(section.currentVersion!==input.expectedSectionVersion)throw new ConflictException('This section changed. Refresh it before recording another outcome.');
   const required=section.evidencePolicy==='REQUIRED'||(section.evidencePolicy==='ON_EXCEPTION'&&input.outcome==='NOT_COMPLETED');if(required&&!input.evidence?.length)throw new BadRequestException('Required photo missing. Save evidence on this device first.');
   const attention:ExecutionAttentionLevel=input.reason==='SAFETY_CONCERN'?'SAFETY_CRITICAL_STOP':input.outcome==='NOT_COMPLETED'?'JOB_LEADER_ATTENTION':'INFORMATIONAL';
   const event=await tx.executionSectionOutcomeEvent.create({data:{operationId:input.operationId,correctionId:correction.id,sectionId,technicianId,outcome:input.outcome,reason:input.reason,note:input.note?.trim(),attentionLevel:attention,fieldRecordedAt:at,expectedSectionVersion:input.expectedSectionVersion}});
   for(const e of input.evidence??[])await tx.executionSectionEvidence.upsert({where:{localEvidenceId:e.localEvidenceId},create:{localEvidenceId:e.localEvidenceId,workOrderId,scopeRevisionId:input.scopeRevisionId,sectionId,technicianId,purpose:input.outcome==='NOT_COMPLETED'?'EXCEPTION_EVIDENCE':'REQUIRED_SECTION_EVIDENCE',capturedAt:new Date(e.capturedAt),syncState:e.syncState??'CAPTURED_LOCAL',outcomeEventId:event.id},update:{outcomeEventId:event.id}});
   const changed=await tx.workOrderExecutionSection.updateMany({where:{id:sectionId,currentVersion:input.expectedSectionVersion},data:{currentOutcome:input.outcome,currentOutcomeEventId:event.id,currentVersion:{increment:1}}});if(changed.count!==1)throw new ConflictException('This section changed while your correction was saved.');
   const acknowledgement=await tx.workOrder.findUniqueOrThrow({where:{id:workOrderId},select:{completionAcknowledgedAt:true,completionAcknowledgedById:true,completionCorrespondenceEligibleAt:true}});
   await tx.workOrderCompletionCorrection.update({where:{id:correction.id},data:{status:'IN_PROGRESS',firstCorrectedAt:correction.firstCorrectedAt??new Date(),...(!correction.priorAcknowledgedAt&&acknowledgement.completionAcknowledgedAt?{priorAcknowledgedAt:acknowledgement.completionAcknowledgedAt,priorAcknowledgedById:acknowledgement.completionAcknowledgedById,priorCorrespondenceEligibleAt:acknowledgement.completionCorrespondenceEligibleAt}:{})}});
   await tx.workOrder.update({where:{id:workOrderId},data:{completionAcknowledgedAt:null,completionAcknowledgedById:null,completionCorrespondenceEligibleAt:null}});
   await tx.workOrderActivity.create({data:{workOrderId,type:'SECTION_OUTCOME_RECORDED',actorId:userId,newStatus:'COMPLETED',note:`Corrected outcome ${event.id} accepted under correction ${correction.id}; prior outcome history was retained.`}});return event;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 async resubmit(userId:string,workOrderId:string,input:ResubmitCompletionCorrectionInput){
  if(!UUID.test(input.operationId)||!UUID.test(input.correctionId))throw new BadRequestException('Valid correction and operation IDs are required.');const field=new Date(input.fieldResubmittedAt);if(!Number.isFinite(field.getTime()))throw new BadRequestException('A valid resubmission timestamp is required.');const requestHash=hash({workOrderId,correctionId:input.correctionId,fieldResubmittedAt:field.toISOString()});
  return this.prisma.$transaction(async tx=>{const technicianId=await this.technician(tx,userId);const replay=await tx.workOrderCompletionCorrection.findUnique({where:{resubmissionOperationId:input.operationId}});if(replay){if(replay.resubmissionRequestHash!==requestHash)throw new ConflictException('This operation ID was already used for another resubmission.');return replay;}
   const correction=await tx.workOrderCompletionCorrection.findFirst({where:{id:input.correctionId,workOrderId},include:{correctedOutcomes:{select:{id:true}}}});if(!correction)throw new NotFoundException('Correction was not found.');if(correction.technicianId!==technicianId)throw new ForbiddenException('Only the corrected completion Technician may resubmit.');if(correction.status!=='IN_PROGRESS'||!correction.correctedOutcomes.length)throw new ConflictException('Record an authorized corrected outcome before resubmitting.');
   const job=await tx.workOrder.findFirst({where:{id:workOrderId,status:'COMPLETED',assignedTechnicians:{some:{technicianId}}},select:{startedScopeRevisionId:true}});if(!job)throw new ConflictException('The completed Work Order assignment is no longer valid.');
   return tx.workOrderCompletionCorrection.update({where:{id:correction.id},data:{status:'RESUBMITTED',resubmissionOperationId:input.operationId,resubmissionRequestHash:requestHash,resubmittedAt:new Date(),fieldResubmittedAt:field}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
}
