import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExecutionExceptionReason, ExecutionSectionOutcome, Prisma, TechnicianStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { isAccessOperationallyResolved } from '../work-orders/access-operations-policy';

export type TechnicianListView = 'today' | 'upcoming' | 'recent' | 'cache';
export type StartJobInput = { operationId: string; startedAt: string; expectedVersion: string; expectedScopeRevisionId: string };
export type SectionOutcomeInput = { operationId:string; scopeRevisionId:string; outcome:ExecutionSectionOutcome; reason?:ExecutionExceptionReason; note?:string; fieldRecordedAt:string; expectedSectionVersion:number; evidence?:Array<{localEvidenceId:string;capturedAt:string;syncState?:'CAPTURED_LOCAL'|'QUEUED'|'RETRY_PENDING'}> };
export type EvidenceAcknowledgementInput={scopeRevisionId:string;purpose:'REQUIRED_SECTION_EVIDENCE'|'EXCEPTION_EVIDENCE';capturedAt:string;storagePath:string};
export type CompleteJobInput={operationId:string;scopeRevisionId:string;fieldCompletedAt:string;expectedVersion:string;expectedStatus:'ON_SITE'|'WAITING_FOR_PARTS'};
const PRE_START: WorkOrderStatus[] = [WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED, WorkOrderStatus.TRAVELLING];
const DAY = 86_400_000;

const technicianSelect = { id: true, firstName: true, lastName: true } as const;
const briefSelect = {
  id: true, reference: true, title: true, description: true, status: true, scheduledAt: true,
  preferredTimeWindow: true, updatedAt: true, startedAt: true, jobLeaderId: true, accessReadiness: true,
  temporaryAccessCredentials: { select: { reviewStatus: true, validFrom: true, expiresAt: true, revokedAt: true } },
  service: { select: { name: true, description: true } },
  addOns: { select: { quantity: true, service: { select: { name: true } } } },
  assignedTechnicians: { select: { technicianId: true, technician: { select: technicianSelect } } },
  property: { select: { name: true, addressLine1: true, addressLine2: true, city: true, province: true, postalCode: true,
    accessNotes: true, parkingNotes: true, bedrooms: true, bathrooms: true, livingAreas: true, storeys: true,
    floorSize: true, outdoorArea: true, hasPets: true, petNotes: true, hasCameras: true, offLimitsNotes: true,
    fragileItemNotes: true, productRestrictionNotes: true, allergyNotes: true } },
  accessInstructions: true, parkingInstructions: true, keyHandover: true, keyHandoverDetails: true,
  someonePresent: true, ecoFriendlyProducts: true, customerDeclaredExistingDamage: true,
  startedScopeRevisionId: true,
  executionScopeRevisions: { orderBy: { revision: 'desc' as const }, take: 1, select: { id:true, revision:true, additions:true, exclusions:true, createdAt:true, sections:{ orderBy:{sortOrder:'asc' as const}, select:{id:true,stableKey:true,title:true,quantity:true,requirements:true,evidencePolicy:true,currentOutcome:true,currentVersion:true,currentOutcomeEvent:{select:{technicianId:true,reason:true,note:true,attentionLevel:true,fieldRecordedAt:true}},evidence:{select:{localEvidenceId:true,syncState:true,capturedAt:true,serverAcknowledgedAt:true}}} } } },
} satisfies Prisma.WorkOrderSelect;

@Injectable()
export class TechnicianJobsService {
  constructor(private readonly prisma: PrismaService) {}

  private async technicianFor(userId: string) {
    const record = await this.prisma.employeeRecord.findFirst({
      where: { userId, status: 'ACTIVE', technician: { status: TechnicianStatus.ACTIVE } },
      select: { technicianId: true },
    });
    if (!record?.technicianId) throw new ForbiddenException('Technician access is not available for this account.');
    return record.technicianId;
  }

  private bounds(view: TechnicianListView, now = new Date()) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const tomorrow = new Date(start.getTime() + DAY);
    if (view === 'today') return { gte: start, lt: tomorrow };
    if (view === 'upcoming') return { gte: tomorrow };
    if (view === 'cache') return { gte: start, lt: new Date(start.getTime() + 3 * DAY) };
    if (view === 'recent') return { gte: new Date(start.getTime() - 30 * DAY), lt: start };
    throw new BadRequestException('Unknown Technician job view.');
  }

  async list(userId: string, view: TechnicianListView) {
    const technicianId = await this.technicianFor(userId);
    const scheduledAt = this.bounds(view);
    const jobs = await this.prisma.workOrder.findMany({
      where: { assignedTechnicians: { some: { technicianId } }, scheduledAt,
        ...(view === 'recent' ? {} : { status: { not: WorkOrderStatus.CANCELLED } }) },
      select: briefSelect, orderBy: { scheduledAt: 'asc' }, take: view === 'upcoming' ? 50 : 30,
    });
    return { technicianId, view, jobs: jobs.map((job) => this.dto(job, technicianId)), serverTime: new Date().toISOString() };
  }

  async brief(userId: string, id: string) {
    const technicianId = await this.technicianFor(userId);
    const job = await this.prisma.workOrder.findFirst({ where: { id, assignedTechnicians: { some: { technicianId } } }, select: briefSelect });
    if (!job) throw new NotFoundException('Assigned job was not found.');
    return this.dto(job, technicianId);
  }

  async start(userId: string, id: string, input: StartJobInput) {
    const technicianId = await this.technicianFor(userId);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.operationId)) throw new BadRequestException('A valid operation ID is required.');
    const fieldStartedAt = new Date(input.startedAt);
    const expectedVersion = new Date(input.expectedVersion);
    if (!Number.isFinite(fieldStartedAt.getTime()) || !Number.isFinite(expectedVersion.getTime())) throw new BadRequestException('Valid operation timestamps are required.');
    if (fieldStartedAt.getTime() > Date.now() + 5 * 60_000) throw new BadRequestException('Start time cannot be in the future.');

    await this.prisma.$transaction(async (tx) => {
      const job = await tx.workOrder.findFirst({ where: { id, assignedTechnicians: { some: { technicianId } } }, select: { id: true, status: true, updatedAt: true, jobLeaderId: true, startedAt: true, startOperationId: true, startedScopeRevisionId:true, executionScopeRevisions:{orderBy:{revision:'desc'},take:1,select:{id:true}}, assignedTechnicians: { select: { technicianId: true } } } });
      if (!job) throw new NotFoundException('Assigned job was not found.');
      if (job.startOperationId === input.operationId && job.startedAt) return;
      if (job.startedAt || job.startOperationId) throw new ConflictException('This job was already started by another operation.');
      if (job.jobLeaderId !== technicianId) throw new ForbiddenException('Only the assigned Job Leader can start this job.');
      if (!job.assignedTechnicians.some((item) => item.technicianId === job.jobLeaderId)) throw new ConflictException('Job staffing must be corrected before starting.');
      if (!PRE_START.includes(job.status)) throw new ConflictException('This job cannot be started in its current state.');
      const applicableScopeId=job.executionScopeRevisions[0]?.id;
      if (!applicableScopeId) throw new ConflictException('This job needs an Execution Scope before it can start.');
      if (applicableScopeId!==input.expectedScopeRevisionId) throw new ConflictException('The job scope changed. Review the latest checklist before starting.');
      if (job.updatedAt.getTime() !== expectedVersion.getTime()) throw new ConflictException('The cached job changed. Refresh it before starting.');
      const result = await tx.workOrder.updateMany({ where: { id, startedAt: null, startOperationId: null, updatedAt: job.updatedAt, jobLeaderId: technicianId, status: { in: PRE_START } }, data: { startedAt: fieldStartedAt, startedByTechnicianId: technicianId, startOperationId: input.operationId, startedScopeRevisionId:applicableScopeId, status: WorkOrderStatus.ON_SITE } });
      if (result.count !== 1) throw new ConflictException('The job changed while it was being started.');
      await tx.workOrderActivity.create({ data: { workOrderId: id, type: 'JOB_STARTED', actorId: userId, previousStatus: job.status, newStatus: WorkOrderStatus.ON_SITE, note: 'Started by the assigned Job Leader in Homent Technician.' } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.brief(userId, id);
  }

  async recordSection(userId:string,workOrderId:string,sectionId:string,input:SectionOutcomeInput){
    const technicianId=await this.technicianFor(userId); if(!/^[0-9a-f-]{36}$/i.test(input.operationId))throw new BadRequestException('A valid operation ID is required.');
    if(input.outcome==='NOT_COMPLETED'&&(!input.reason||!input.note?.trim()))throw new BadRequestException('Choose a reason and add a short note.');
    if(input.outcome==='PENDING'&&input.reason)throw new BadRequestException('Pending sections cannot have an exception reason.');
    const fieldRecordedAt=new Date(input.fieldRecordedAt); if(!Number.isFinite(fieldRecordedAt.getTime()))throw new BadRequestException('A valid field timestamp is required.');
    return this.prisma.$transaction(async(tx)=>{
      const duplicate=await tx.executionSectionOutcomeEvent.findUnique({where:{operationId:input.operationId}}); if(duplicate)return duplicate;
      const section=await tx.workOrderExecutionSection.findFirst({where:{id:sectionId,scopeRevisionId:input.scopeRevisionId,scopeRevision:{workOrderId,workOrder:{assignedTechnicians:{some:{technicianId}},startedScopeRevisionId:input.scopeRevisionId}}},include:{currentOutcomeEvent:true}});
      if(!section)throw new NotFoundException('Assigned checklist section was not found.');
      const job=await tx.workOrder.findUnique({where:{id:workOrderId},select:{jobLeaderId:true}}); const leader=job?.jobLeaderId===technicianId;
      if(section.currentOutcomeEvent&&section.currentOutcomeEvent.technicianId!==technicianId&&!leader)throw new ForbiddenException('Ask the Job Leader to correct this section.');
      if(section.currentVersion!==input.expectedSectionVersion)throw new ConflictException('This section changed. Refresh it before recording another outcome.');
      const evidenceRequired=section.evidencePolicy==='REQUIRED'||(section.evidencePolicy==='ON_EXCEPTION'&&input.outcome==='NOT_COMPLETED');
      if(evidenceRequired&&!input.evidence?.length)throw new BadRequestException('Required photo missing. Save evidence on this device first.');
      const attention=input.reason==='SAFETY_CONCERN'?'SAFETY_CRITICAL_STOP':input.outcome==='NOT_COMPLETED'?'JOB_LEADER_ATTENTION':'INFORMATIONAL';
      const event=await tx.executionSectionOutcomeEvent.create({data:{operationId:input.operationId,sectionId,technicianId,outcome:input.outcome,reason:input.reason,note:input.note?.trim(),attentionLevel:attention,fieldRecordedAt,expectedSectionVersion:input.expectedSectionVersion}});
      for(const evidence of input.evidence??[]) await tx.executionSectionEvidence.upsert({where:{localEvidenceId:evidence.localEvidenceId},create:{localEvidenceId:evidence.localEvidenceId,workOrderId,scopeRevisionId:input.scopeRevisionId,sectionId,technicianId,purpose:input.outcome==='NOT_COMPLETED'?'EXCEPTION_EVIDENCE':'REQUIRED_SECTION_EVIDENCE',capturedAt:new Date(evidence.capturedAt),syncState:evidence.syncState??'CAPTURED_LOCAL',outcomeEventId:event.id},update:{outcomeEventId:event.id}});
      const changed=await tx.workOrderExecutionSection.updateMany({where:{id:sectionId,currentVersion:input.expectedSectionVersion},data:{currentOutcome:input.outcome,currentOutcomeEventId:event.id,currentVersion:{increment:1}}}); if(changed.count!==1)throw new ConflictException('This section changed while your update was saved.');
      await tx.workOrderActivity.create({data:{workOrderId,type:'SECTION_OUTCOME_RECORDED',actorId:userId,note:`Section ${section.stableKey} recorded as ${input.outcome}.`}}); return event;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  async acknowledgeEvidence(userId:string,workOrderId:string,sectionId:string,evidenceId:string,input:EvidenceAcknowledgementInput){
    const technicianId=await this.technicianFor(userId);const capturedAt=new Date(input.capturedAt);if(!Number.isFinite(capturedAt.getTime()))throw new BadRequestException('A valid capture timestamp is required.');
    const expectedPath=`${workOrderId}/${input.scopeRevisionId}/${sectionId}/${evidenceId}.webp`;if(input.storagePath!==expectedPath)throw new BadRequestException('Evidence storage path does not match its stable identity.');
    return this.prisma.$transaction(async tx=>{
      const section=await tx.workOrderExecutionSection.findFirst({where:{
        id:sectionId,
        scopeRevisionId:input.scopeRevisionId,
        scopeRevision:{workOrderId,workOrder:{assignedTechnicians:{some:{technicianId}},startedScopeRevisionId:input.scopeRevisionId}},
      }});if(!section)throw new NotFoundException('Assigned active checklist section was not found.');
      const existing=await tx.executionSectionEvidence.findUnique({where:{localEvidenceId:evidenceId}});if(existing){if(existing.workOrderId!==workOrderId||existing.scopeRevisionId!==input.scopeRevisionId||existing.sectionId!==sectionId||existing.technicianId!==technicianId)throw new ConflictException('Evidence identity is already bound to another context.');return existing.syncState==='SERVER_ACKNOWLEDGED'?existing:tx.executionSectionEvidence.update({where:{id:existing.id},data:{purpose:input.purpose,storagePath:expectedPath,syncState:'SERVER_ACKNOWLEDGED',serverAcknowledgedAt:new Date()}})}
      return tx.executionSectionEvidence.create({data:{localEvidenceId:evidenceId,workOrderId,scopeRevisionId:input.scopeRevisionId,sectionId,technicianId,purpose:input.purpose,capturedAt,storagePath:expectedPath,syncState:'SERVER_ACKNOWLEDGED',serverAcknowledgedAt:new Date()}})
    });
  }

  async complete(userId:string,id:string,input:CompleteJobInput){
    const technicianId=await this.technicianFor(userId);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.operationId))throw new BadRequestException('A valid operation ID is required.');
    const fieldCompletedAt=new Date(input.fieldCompletedAt),expectedVersion=new Date(input.expectedVersion);if(!Number.isFinite(fieldCompletedAt.getTime())||!Number.isFinite(expectedVersion.getTime())||fieldCompletedAt.getTime()>Date.now()+5*60_000)throw new BadRequestException('Valid completion timestamps are required.');
    return this.prisma.$transaction(async tx=>{
      const duplicate=await tx.workOrder.findUnique({where:{completionOperationId:input.operationId},select:{id:true,status:true,completionOperationId:true,fieldCompletedAt:true,completionAcceptedAt:true}});
      if(duplicate){if(duplicate.id!==id)throw new ConflictException('Completion identity is already bound to another job.');return duplicate;}
      const job=await tx.workOrder.findFirst({where:{id,assignedTechnicians:{some:{technicianId}}},select:{status:true,jobLeaderId:true,startedAt:true,startedScopeRevisionId:true,completionOperationId:true,executionScopeRevisions:{where:{id:input.scopeRevisionId},select:{sections:{include:{currentOutcomeEvent:true,evidence:true}}}}}});
      if(!job)throw new NotFoundException('Assigned job was not found.');
      if(job.jobLeaderId!==technicianId)throw new ForbiddenException('Only the assigned Job Leader can complete this job.');
      if(job.completionOperationId||job.status===WorkOrderStatus.COMPLETED)throw new ConflictException('This job was completed by another operation.');
      if(!job.startedAt||!([WorkOrderStatus.ON_SITE,WorkOrderStatus.WAITING_FOR_PARTS] as WorkOrderStatus[]).includes(job.status)||job.status!==input.expectedStatus)throw new ConflictException('This job cannot be completed from its current state.');
      if(job.startedScopeRevisionId!==input.scopeRevisionId)throw new ConflictException('The frozen Execution Scope changed. Completion needs review.');
      const sections=job.executionScopeRevisions[0]?.sections??[];if(!sections.length)throw new ConflictException('The frozen Execution Scope has no sections.');
      for(const section of sections){
        if(section.currentOutcome==='PENDING')throw new ConflictException(`${section.title} still needs an outcome.`);
        if(section.currentOutcome==='NOT_COMPLETED'&&(!section.currentOutcomeEvent?.reason||!section.currentOutcomeEvent.note?.trim()))throw new ConflictException(`${section.title} needs an exception reason and note.`);
        const required=section.evidencePolicy==='REQUIRED'||(section.evidencePolicy==='ON_EXCEPTION'&&section.currentOutcome==='NOT_COMPLETED');
        if(required&&!section.evidence.length)throw new ConflictException(`${section.title} is missing required evidence.`);
      }
      const acceptedAt=new Date();const changed=await tx.workOrder.updateMany({where:{id,status:job.status,completionOperationId:null,jobLeaderId:technicianId,startedScopeRevisionId:input.scopeRevisionId},data:{status:WorkOrderStatus.COMPLETED,completedAt:fieldCompletedAt,fieldCompletedAt,completionAcceptedAt:acceptedAt,completionOperationId:input.operationId,completedByTechnicianId:technicianId}});if(changed.count!==1)throw new ConflictException('The job changed while completion was accepted.');
      await tx.workOrderActivity.create({data:{workOrderId:id,type:'JOB_COMPLETED',actorId:userId,previousStatus:job.status,newStatus:WorkOrderStatus.COMPLETED,note:`Homent Technician completion ${input.operationId} accepted for frozen scope ${input.scopeRevisionId}.`}});
      return{id,status:WorkOrderStatus.COMPLETED,completionOperationId:input.operationId,fieldCompletedAt,completionAcceptedAt:acceptedAt};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  async review(userId:string,id:string){ const technicianId=await this.technicianFor(userId); const job=await this.prisma.workOrder.findFirst({where:{id,jobLeaderId:technicianId,assignedTechnicians:{some:{technicianId}}},select:{startedScopeRevision:{select:{id:true,sections:{orderBy:{sortOrder:'asc'},include:{currentOutcomeEvent:true,evidence:true}}}}}}); if(!job)throw new ForbiddenException('Only the assigned Job Leader can review this job.'); const sections=job.startedScopeRevision?.sections??[]; const attention:any[]=[]; let syncPending=0; for(const s of sections){if(s.currentOutcome==='PENDING')attention.push({sectionId:s.id,title:s.title,code:'PENDING',message:'Outcome not recorded'}); if(s.currentOutcome==='NOT_COMPLETED'&&(!s.currentOutcomeEvent?.reason||!s.currentOutcomeEvent.note?.trim()))attention.push({sectionId:s.id,title:s.title,code:'INCOMPLETE_EXCEPTION',message:'Reason or note missing'}); const required=s.evidencePolicy==='REQUIRED'||(s.evidencePolicy==='ON_EXCEPTION'&&s.currentOutcome==='NOT_COMPLETED'); if(required&&!s.evidence.length)attention.push({sectionId:s.id,title:s.title,code:'MISSING_EVIDENCE',message:'Required evidence missing'}); syncPending+=s.evidence.filter(e=>e.syncState!=='SERVER_ACKNOWLEDGED').length; if(s.currentOutcomeEvent?.attentionLevel==='SAFETY_CRITICAL_STOP')attention.push({sectionId:s.id,title:s.title,code:'SAFETY_STOP',message:'Stop affected work; safety follow-up is required'}); if(s.currentOutcomeEvent?.reason==='SCOPE_OR_CONDITION_MISMATCH')attention.push({sectionId:s.id,title:s.title,code:'SCOPE_ISSUE',message:'Scope or condition mismatch needs attention'});} return{scopeRevisionId:job.startedScopeRevision?.id??null,accountedFor:sections.filter(s=>s.currentOutcome!=='PENDING').length,totalSections:sections.length,syncPending,attention,ready:sections.length>0&&!attention.length}; }

  private dto(job: any, technicianId: string) {
    const scope=job.startedScopeRevisionId?job.executionScopeRevisions.find((r:any)=>r.id===job.startedScopeRevisionId)??job.executionScopeRevisions[0]:job.executionScopeRevisions[0]??null;
    const accessOperationallyResolved = isAccessOperationallyResolved(job.accessReadiness, job.temporaryAccessCredentials ?? [], new Date());
    const { temporaryAccessCredentials: _protectedCredentialMetadata, ...safeJob } = job;
    return { ...safeJob, technicianId, accessOperationallyResolved, executionScope:scope, executionScopeRevisions:undefined, isJobLeader: job.jobLeaderId === technicianId,
      canStart: job.jobLeaderId === technicianId && !job.startedAt && PRE_START.includes(job.status),
      waitingForJobLeader: job.jobLeaderId !== technicianId && !job.startedAt && PRE_START.includes(job.status),
      cacheable: job.status !== WorkOrderStatus.CANCELLED,
    };
  }
}
