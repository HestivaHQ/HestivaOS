import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind, MessagingMessagePurpose, Prisma, TemporaryAccessCredentialType, WorkOrderAccessRecoveryStatus } from '@prisma/client';
import { MessagingService } from '../messaging/messaging.service';
import { PrismaService } from '../prisma.service';
import { isAccessRecoveryFactEligible } from './access-recovery-policy';
import { WorkOrderTemporaryAccessCredentialsService } from './work-order-temporary-access-credentials.service';

export type InitiateAccessRecoveryInput = { requestId: string; conversationId: string };
export type RegisterRecoveryCandidateInput = { type: TemporaryAccessCredentialType; validFrom?: string; expiresAt?: string; singleUse?: boolean };
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class WorkOrderAccessRecoveryService {
  constructor(private readonly prisma: PrismaService, private readonly messaging: MessagingService, private readonly credentials: WorkOrderTemporaryAccessCredentialsService) {}

  async summary(workOrderId: string) {
    const workOrder = await this.workOrder(workOrderId);
    const channels = isAccessRecoveryFactEligible(workOrder.status, workOrder.accessReadiness) ? await this.messaging.availableCustomerConversations(workOrder.customerId) : [];
    const attempts = await this.prisma.workOrderAccessRecovery.findMany({ where: { workOrderId }, orderBy: { createdAt: 'desc' }, select: { id:true, status:true, sentAt:true, createdAt:true, conversation:{select:{channel:true}}, responseMessage:{select:{id:true,kind:true,attachmentMetadata:true}} } });
    return { eligible: isAccessRecoveryFactEligible(workOrder.status, workOrder.accessReadiness) && channels.length > 0, accessReadiness: workOrder.accessReadiness, availableChannels: channels.map(({id,channel})=>({id,channel})), attempts: attempts.map(a=>({ id:a.id,status:a.status,sentAt:a.sentAt,createdAt:a.createdAt,channel:a.conversation.channel,responseRequiresReview:a.status===WorkOrderAccessRecoveryStatus.RESPONSE_REQUIRES_REVIEW,responseMessageId:a.responseMessage?.id??null,responseHasAttachment:Array.isArray(a.responseMessage?.attachmentMetadata)&&a.responseMessage.attachmentMetadata.length>0 })) };
  }

  async initiate(workOrderId:string,input:InitiateAccessRecoveryInput,actorId:string) {
    if(!UUID.test(input.requestId)) throw new BadRequestException('requestId must be a UUID.');
    const existing=await this.prisma.workOrderAccessRecovery.findUnique({where:{requestId:input.requestId},include:{conversation:true,outboundMessage:true}});
    if(existing){if(existing.workOrderId!==workOrderId)throw new ConflictException('Request identity is already bound to another Work Order.');return this.deliver(existing);}
    const workOrder=await this.workOrder(workOrderId);
    if(!isAccessRecoveryFactEligible(workOrder.status,workOrder.accessReadiness))throw new ConflictException('Access recovery is not applicable to this Work Order.');
    const available=await this.messaging.availableCustomerConversations(workOrder.customerId);
    if(!available.some(c=>c.id===input.conversationId))throw new BadRequestException('Select an available configured messaging channel.');
    const conversation=await this.prisma.messagingConversation.findFirst({where:{id:input.conversationId,customerId:workOrder.customerId}});
    if(!conversation)throw new BadRequestException('The selected conversation is not linked to this customer.');
    const date=workOrder.scheduledAt?` on ${new Intl.DateTimeFormat('en-ZA',{dateStyle:'long',timeZone:'Africa/Johannesburg'}).format(workOrder.scheduledAt)}`:'';
    const text=`Please reply with the access information needed for your upcoming Hestiva visit${date}. Please do not send payment information.`;
    const created=await this.prisma.$transaction(async tx=>{
      const message=await tx.messagingMessage.create({data:{conversationId:conversation.id,direction:MessagingDirection.OUTBOUND,kind:MessagingMessageKind.TEXT,purpose:MessagingMessagePurpose.WORK_ORDER_ACCESS_RECOVERY,idempotencyKey:`access-recovery:${input.requestId}`,contentText:text,occurredAt:new Date()}});
      await tx.messagingMessageStatusEvent.create({data:{messageId:message.id,status:MessagingDeliveryStatus.PENDING}});
      return tx.workOrderAccessRecovery.create({data:{workOrderId,conversationId:conversation.id,outboundMessageId:message.id,initiatedById:actorId,requestId:input.requestId,accessReadinessAtRequest:workOrder.accessReadiness,workOrderUpdatedAtAtRequest:workOrder.updatedAt},include:{conversation:true,outboundMessage:true}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    return this.deliver(created);
  }

  async registerCandidate(workOrderId:string,recoveryId:string,input:RegisterRecoveryCandidateInput,actorId:string){
    const recovery=await this.prisma.workOrderAccessRecovery.findFirst({where:{id:recoveryId,workOrderId},include:{responseMessage:true,workOrder:true}});
    if(!recovery?.responseMessage)throw new NotFoundException('A linked recovery response was not found.');
    if(recovery.status===WorkOrderAccessRecoveryStatus.CLOSED){const existing=(await this.credentials.list(workOrderId,actorId)).find(item=>item.sourceMessageId===recovery.responseMessage!.id);if(existing)return existing;}
    if(recovery.status!==WorkOrderAccessRecoveryStatus.RESPONSE_REQUIRES_REVIEW)throw new ConflictException('This recovery response is not awaiting review.');
    if(recovery.workOrder.updatedAt.getTime()!==recovery.workOrderUpdatedAtAtRequest.getTime()||!isAccessRecoveryFactEligible(recovery.workOrder.status,recovery.workOrder.accessReadiness))throw new ConflictException('Access facts changed after this request. Review the current Work Order before registering evidence.');
    const media=Array.isArray(recovery.responseMessage.attachmentMetadata)?recovery.responseMessage.attachmentMetadata as Array<Record<string,unknown>>:[];
    const attachment=media.find(item=>typeof item.privateStoragePath==='string');
    const protectedText=recovery.responseMessage.contentText?.trim();
    if(!protectedText&&!attachment)throw new BadRequestException('The response has no protected text or secured private attachment to register.');
    const credential=await this.credentials.create(workOrderId,{requestId:recovery.responseMessage.id,type:input.type,protectedText,attachmentStoragePath:attachment?.privateStoragePath as string|undefined,attachmentFileName:attachment?.fileName as string|undefined,attachmentMediaType:attachment?.mimeType as string|undefined,derivedMetadata:{source:'MESSAGING_ACCESS_RECOVERY',sourceMessageId:recovery.responseMessage.id},validFrom:input.validFrom,expiresAt:input.expiresAt,singleUse:input.singleUse,sourceMessageId:recovery.responseMessage.id},actorId);
    await this.prisma.workOrderAccessRecovery.update({where:{id:recovery.id},data:{status:WorkOrderAccessRecoveryStatus.CLOSED,closedAt:new Date()}});
    return credential;
  }

  private async deliver(recovery:{id:string;status:WorkOrderAccessRecoveryStatus;conversation:{id:string;channel:any;provider:string;providerIdentityId:string};outboundMessage:{id:string;contentText:string|null;idempotencyKey:string|null}}){
    if(recovery.status===WorkOrderAccessRecoveryStatus.SENT||recovery.status===WorkOrderAccessRecoveryStatus.RESPONSE_REQUIRES_REVIEW||recovery.status===WorkOrderAccessRecoveryStatus.CLOSED)return this.summaryResult(recovery.id);
    try{const result=await this.messaging.send({channel:recovery.conversation.channel,provider:recovery.conversation.provider,providerIdentityId:recovery.conversation.providerIdentityId,conversationId:recovery.conversation.id,idempotencyKey:recovery.outboundMessage.idempotencyKey!,kind:'TEXT',text:recovery.outboundMessage.contentText!});await this.prisma.$transaction([this.prisma.messagingMessageStatusEvent.create({data:{messageId:recovery.outboundMessage.id,status:MessagingDeliveryStatus.ACCEPTED,providerMessageId:result.providerMessageId}}),this.prisma.workOrderAccessRecovery.update({where:{id:recovery.id},data:{status:WorkOrderAccessRecoveryStatus.SENT,sentAt:new Date(result.acceptedAt)}})]);return this.summaryResult(recovery.id);}catch{await this.prisma.$transaction([this.prisma.messagingMessageStatusEvent.create({data:{messageId:recovery.outboundMessage.id,status:MessagingDeliveryStatus.FAILED}}),this.prisma.workOrderAccessRecovery.update({where:{id:recovery.id},data:{status:WorkOrderAccessRecoveryStatus.SEND_FAILED}})]);throw new ConflictException('The recovery message was not accepted. Retry with the same request identity.');}
  }
  private summaryResult(id:string){return this.prisma.workOrderAccessRecovery.findUniqueOrThrow({where:{id},select:{id:true,status:true,sentAt:true,createdAt:true,conversation:{select:{channel:true}}}});}
  private async workOrder(id:string){const row=await this.prisma.workOrder.findUnique({where:{id},select:{id:true,customerId:true,status:true,accessReadiness:true,scheduledAt:true,updatedAt:true}});if(!row)throw new NotFoundException('Work order not found.');return row;}
}
