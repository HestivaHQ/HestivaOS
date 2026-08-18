import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AttentionActivityType, AttentionState, Prisma, WorkOrderActivityType, WorkOrderStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { johannesburgBusinessDate } from './work-orders.service';

export type CreateReplacementVisitInput = {
  operationId: string;
  scheduledAt: string;
  note?: string;
};

type InterruptionRow = { id:string; work_order_id:string };
type RouteRow = { next_action:string };
type ReplacementRow = { id:string; operation_id:string; interruption_id:string; original_work_order_id:string; replacement_work_order_id:string; actor_id:string; scheduled_at:Date; note:string|null; request_hash:string; created_at:Date };
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class WorkOrderReplacementVisitService {
  constructor(private readonly prisma:PrismaService){}

  async create(originalWorkOrderId:string,input:CreateReplacementVisitInput,actorId:string){
    if(!UUID.test(input.operationId??''))throw new BadRequestException('operationId must be a UUID generated once for this replacement visit.');
    const scheduledAt=new Date(input.scheduledAt);
    if(!Number.isFinite(scheduledAt.getTime())||scheduledAt.getTime()<Date.now()-5*60_000)throw new BadRequestException('Choose a valid future replacement service time.');
    const note=input.note?.trim()||null;
    if(note&&(note.length<3||note.length>1000))throw new BadRequestException('Replacement note must be between 3 and 1000 characters.');
    const requestHash=createHash('sha256').update(JSON.stringify({originalWorkOrderId,scheduledAt:scheduledAt.toISOString(),note})).digest('hex');
    const replay=await this.byOperation(input.operationId);if(replay)return this.recover(replay,originalWorkOrderId,requestHash,this.prisma);

    return this.prisma.$transaction(async tx=>{
      const duplicate=await this.byOperation(input.operationId,tx);if(duplicate)return this.recover(duplicate,originalWorkOrderId,requestHash,tx);
      const interruption=await this.interruptionFor(originalWorkOrderId,tx);if(!interruption)throw new NotFoundException('Interrupted visit record was not found.');
      const existing=await this.byInterruption(interruption.id,tx);if(existing)throw new ConflictException('This interrupted visit already has a linked replacement Work Order.');
      const latestRoute=await this.latestRoute(interruption.id,tx);
      if(latestRoute?.next_action!=='REPLACEMENT_VISIT')throw new ConflictException('Route this interrupted visit to Replacement Visit before creating the replacement Work Order.');

      const source=await tx.workOrder.findUnique({where:{id:originalWorkOrderId},select:{
        id:true,status:true,customerId:true,propertyId:true,serviceId:true,recurringAgreementId:true,frequency:true,customFrequencyNote:true,homeCondition:true,description:true,priority:true,
        exactFloor:true,buildingAccess:true,complexAccess:true,accessInstructions:true,parkingInstructions:true,keyHandover:true,keyHandoverDetails:true,someonePresent:true,ecoFriendlyProducts:true,customerDeclaredExistingDamage:true,
        addOns:{select:{serviceId:true,quantity:true}}
      }});
      if(!source)throw new NotFoundException('Original Work Order not found.');
      if(source.status!==WorkOrderStatus.INTERRUPTED)throw new ConflictException('Only an interrupted Work Order can produce a replacement visit.');
      if(!source.serviceId)throw new ConflictException('The interrupted Work Order has no primary service to carry forward.');

      const businessDate=johannesburgBusinessDate();
      const counter=await tx.workOrderDailyCounter.upsert({where:{businessDate},create:{businessDate,sequence:1},update:{sequence:{increment:1}}});
      if(counter.sequence>9999)throw new BadRequestException('The daily work order reference limit has been reached.');
      const reference=`WO-${businessDate}-${String(counter.sequence).padStart(4,'0')}`;
      const replacement=await tx.workOrder.create({data:{
        customerId:source.customerId,propertyId:source.propertyId,createdById:actorId,serviceId:source.serviceId,recurringAgreementId:source.recurringAgreementId,
        frequency:source.frequency,customFrequencyNote:source.customFrequencyNote,homeCondition:source.homeCondition,description:source.description,priority:source.priority,
        exactFloor:source.exactFloor,buildingAccess:source.buildingAccess,complexAccess:source.complexAccess,accessInstructions:source.accessInstructions,parkingInstructions:source.parkingInstructions,keyHandover:source.keyHandover,keyHandoverDetails:source.keyHandoverDetails,someonePresent:source.someonePresent,ecoFriendlyProducts:source.ecoFriendlyProducts,customerDeclaredExistingDamage:source.customerDeclaredExistingDamage,
        addOns:source.addOns.length?{create:source.addOns.map(item=>({serviceId:item.serviceId,quantity:item.quantity}))}:undefined,
        reference,title:reference,status:WorkOrderStatus.NEW,scheduledAt
      },select:{id:true,reference:true,status:true,scheduledAt:true}});

      const linkId=randomUUID();
      await tx.$executeRaw(Prisma.sql`INSERT INTO "work_order_replacement_visits" ("id","operation_id","interruption_id","original_work_order_id","replacement_work_order_id","actor_id","scheduled_at","note","request_hash") VALUES (CAST(${linkId} AS UUID),CAST(${input.operationId} AS UUID),CAST(${interruption.id} AS UUID),CAST(${originalWorkOrderId} AS UUID),CAST(${replacement.id} AS UUID),CAST(${actorId} AS UUID),${scheduledAt},${note},${requestHash})`);
      await tx.workOrderActivity.create({data:{workOrderId:replacement.id,type:WorkOrderActivityType.WORK_ORDER_CREATED,newStatus:WorkOrderStatus.NEW,actorId,note:`Replacement visit created for interrupted Work Order ${originalWorkOrderId}.`}});
      const attention=await tx.attentionItem.findUnique({where:{conditionKey:`work-order:${originalWorkOrderId}:interrupted-visit-review`},select:{id:true,state:true}});
      if(attention?.state===AttentionState.OPEN){
        await tx.attentionItem.update({where:{id:attention.id},data:{state:AttentionState.RESOLVED,resolvedAt:new Date(),lastObservedAt:new Date(),activities:{create:{type:AttentionActivityType.AUTO_RESOLVED,actorId,metadata:{reason:'REPLACEMENT_VISIT_CREATED',replacementWorkOrderId:replacement.id}}}}});
      }
      const saved=await this.byOperation(input.operationId,tx);if(!saved)throw new ConflictException('Replacement visit link could not be recovered after creation.');
      return {...this.serialize(saved,false),replacement};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  async detail(originalWorkOrderId:string){
    const interruption=await this.interruptionFor(originalWorkOrderId);if(!interruption)return null;
    const link=await this.byInterruption(interruption.id);if(!link)return null;
    const replacement=await this.replacementSummary(link.replacement_work_order_id,this.prisma);
    return {...this.serialize(link,false),replacement};
  }

  private async interruptionFor(workOrderId:string,db:PrismaService|Prisma.TransactionClient=this.prisma){const rows=await db.$queryRaw<InterruptionRow[]>(Prisma.sql`SELECT "id","work_order_id" FROM "work_order_interruptions" WHERE "work_order_id"=CAST(${workOrderId} AS UUID) LIMIT 1`);return rows[0]??null;}
  private async latestRoute(interruptionId:string,db:PrismaService|Prisma.TransactionClient=this.prisma){const rows=await db.$queryRaw<RouteRow[]>(Prisma.sql`SELECT "next_action" FROM "work_order_interruption_routes" WHERE "interruption_id"=CAST(${interruptionId} AS UUID) ORDER BY "created_at" DESC,"id" DESC LIMIT 1`);return rows[0]??null;}
  private async byOperation(operationId:string,db:PrismaService|Prisma.TransactionClient=this.prisma){const rows=await db.$queryRaw<ReplacementRow[]>(Prisma.sql`SELECT * FROM "work_order_replacement_visits" WHERE "operation_id"=CAST(${operationId} AS UUID) LIMIT 1`);return rows[0]??null;}
  private async byInterruption(interruptionId:string,db:PrismaService|Prisma.TransactionClient=this.prisma){const rows=await db.$queryRaw<ReplacementRow[]>(Prisma.sql`SELECT * FROM "work_order_replacement_visits" WHERE "interruption_id"=CAST(${interruptionId} AS UUID) LIMIT 1`);return rows[0]??null;}
  private replacementSummary(id:string,db:PrismaService|Prisma.TransactionClient){return db.workOrder.findUnique({where:{id},select:{id:true,reference:true,status:true,scheduledAt:true}});}
  private async recover(row:ReplacementRow,originalWorkOrderId:string,hash:string,db:PrismaService|Prisma.TransactionClient){if(row.original_work_order_id!==originalWorkOrderId||row.request_hash!==hash)throw new ConflictException('Replacement operation ID is already bound to a different request.');const replacement=await this.replacementSummary(row.replacement_work_order_id,db);return{...this.serialize(row,true),replacement};}
  private serialize(row:ReplacementRow,replayed:boolean){return{id:row.id,operationId:row.operation_id,interruptionId:row.interruption_id,originalWorkOrderId:row.original_work_order_id,replacementWorkOrderId:row.replacement_work_order_id,actorId:row.actor_id,scheduledAt:row.scheduled_at.toISOString(),note:row.note,createdAt:row.created_at.toISOString(),replayed};}
}
