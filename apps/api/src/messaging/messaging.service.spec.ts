import { MessagingDeliveryStatus, MessagingDirection, WorkOrderAccessRecoveryStatus } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { MessagingProviderOutcomeUnknownError } from './messaging-provider-adapter';
import { MessagingOutcomePendingReconciliationError, MessagingService } from './messaging.service';
import type { NormalizedInboundMessagingEvent } from './messaging-contract';

function inboundEvent(): NormalizedInboundMessagingEvent { return { contractVersion:'1.0',channel:'WHATSAPP',provider:'meta',providerEventId:'message:wamid.1',providerMessageId:'wamid.1',providerConversationId:'phone-1:27821234567',identity:{providerIdentityId:'27821234567',phoneE164:'+27821234567'},occurredAt:'2026-08-20T15:00:00.000Z',receivedAt:'2026-08-20T15:00:01.000Z',kind:'TEXT',text:'I need a quote',attribution:{sourceType:'ad',sourceId:'ad-1',clickId:'click-1',providerMetadata:{ctwa_clid:'click-1'}} }; }

describe('MessagingService', () => {
  it('persists referral provenance in the existing JSON metadata field', async () => {
    const createMessage=jest.fn(async({data}:any)=>({id:'message-1',occurredAt:data.occurredAt,...data}));
    const tx={messagingMessage:{findUnique:jest.fn(async()=>null),create:createMessage},messagingConversation:{upsert:jest.fn(async()=>({id:'conversation-1'}))},messagingMessageStatusEvent:{create:jest.fn(async()=>({id:'status-1'}))},workOrderAccessRecovery:{findFirst:jest.fn(async()=>null),update:jest.fn()}};
    const prisma={$transaction:jest.fn(async(callback:any)=>callback(tx))};
    const service=new MessagingService(prisma as any,{} as any);
    await service.persistInbound(inboundEvent());
    expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({attachmentMetadata:{attribution:expect.objectContaining({sourceId:'ad-1',clickId:'click-1'})}})}));
  });

  it('marks an ambiguous send attempt as pending reconciliation and blocks a blind replay', async () => {
    const message={id:'message-1',direction:MessagingDirection.OUTBOUND,statusEvents:[{status:MessagingDeliveryStatus.PENDING,providerMessageId:null,createdAt:new Date()}]};
    const statusRows:any[]=[...message.statusEvents];
    const prisma={messagingMessage:{findUnique:jest.fn(async()=>({...message,statusEvents:statusRows}))},messagingMessageStatusEvent:{findFirst:jest.fn(async({where}:any)=>statusRows.slice().reverse().find(row=>(where.status?row.status===where.status:true)&&(where.providerMessageId?.not===null?row.providerMessageId!==null:true))??null),count:jest.fn(async()=>statusRows.filter(row=>row.status===MessagingDeliveryStatus.PENDING).length),create:jest.fn(async({data}:any)=>{const row={...data,createdAt:new Date()};statusRows.push(row);return row;})},workOrderAccessRecovery:{findUnique:jest.fn(async()=>null),update:jest.fn()}};
    const adapter={send:jest.fn(async()=>{throw new MessagingProviderOutcomeUnknownError();})};
    const service=new MessagingService(prisma as any,{get:()=>adapter} as any);
    const command={channel:'WHATSAPP' as const,provider:'meta',providerIdentityId:'27821234567',conversationId:'c',idempotencyKey:'key-1',kind:'TEXT' as const,text:'Hello'};
    await expect(service.send(command)).rejects.toBeInstanceOf(MessagingOutcomePendingReconciliationError);
    await expect(service.send(command)).rejects.toBeInstanceOf(MessagingOutcomePendingReconciliationError);
    expect(adapter.send).toHaveBeenCalledTimes(1);
    expect(statusRows.filter(row=>row.status===MessagingDeliveryStatus.PENDING)).toHaveLength(2);
  });

  it('preserves sent, delivered and read as provider-specific history without changing generic acceptance semantics', async () => {
    const message={id:'message-1',direction:MessagingDirection.OUTBOUND};
    const statusRows:any[]=[];
    const create=jest.fn(async({data}:any)=>{const row={id:`status-${statusRows.length+1}`,createdAt:new Date(),...data};statusRows.push(row);return row;});
    const executeRaw=jest.fn(async()=>1);
    const update=jest.fn(async()=>({}));
    const prisma={
      $executeRaw:executeRaw,
      messagingMessage:{findUnique:jest.fn(async()=>message)},
      messagingMessageStatusEvent:{findFirst:jest.fn(async({where}:any)=>statusRows.find(row=>row.messageId===where.messageId&&row.status===where.status&&row.providerMessageId===(where.providerMessageId??null))??null),create},
      workOrderAccessRecovery:{findUnique:jest.fn(async()=>({id:'recovery-1',status:WorkOrderAccessRecoveryStatus.PENDING_SEND,sentAt:null})),update}
    };
    const service=new MessagingService(prisma as any,{} as any);
    const common={providerMessageId:'wamid.out-1',correlationId:'key-1'};
    await service.persistWhatsAppStatus({...common,providerStatus:'sent',occurredAt:'2026-08-20T15:00:00.000Z'});
    await service.persistWhatsAppStatus({...common,providerStatus:'delivered',occurredAt:'2026-08-20T15:00:05.000Z'});
    await service.persistWhatsAppStatus({...common,providerStatus:'read',occurredAt:'2026-08-20T15:01:00.000Z'});

    expect(executeRaw).toHaveBeenCalledTimes(3);
    expect(statusRows.filter(row=>row.status===MessagingDeliveryStatus.ACCEPTED)).toHaveLength(1);
    expect(statusRows[0]).toEqual(expect.objectContaining({messageId:'message-1',status:MessagingDeliveryStatus.ACCEPTED,providerMessageId:'wamid.out-1'}));
    expect(update).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({status:WorkOrderAccessRecoveryStatus.SENT})}));
  });

  it('keeps explicit provider failure in both provider-specific history and generic retry state', async () => {
    const message={id:'message-1',direction:MessagingDirection.OUTBOUND};
    const executeRaw=jest.fn(async()=>1);
    const create=jest.fn(async({data}:any)=>({id:'status-new',createdAt:new Date(),...data}));
    const update=jest.fn(async()=>({}));
    const prisma={$executeRaw:executeRaw,messagingMessage:{findUnique:jest.fn(async()=>message)},messagingMessageStatusEvent:{findFirst:jest.fn(async()=>null),create},workOrderAccessRecovery:{findUnique:jest.fn(async()=>({id:'recovery-1',status:WorkOrderAccessRecoveryStatus.PENDING_SEND,sentAt:null})),update}};
    const service=new MessagingService(prisma as any,{} as any);
    await service.persistWhatsAppStatus({providerMessageId:'wamid.out-1',correlationId:'key-1',providerStatus:'failed',occurredAt:'2026-08-20T15:00:00.000Z'});
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({data:{messageId:'message-1',status:MessagingDeliveryStatus.FAILED,providerMessageId:'wamid.out-1'}});
    expect(update).toHaveBeenCalledWith(expect.objectContaining({data:{status:WorkOrderAccessRecoveryStatus.SEND_FAILED}}));
  });
});
