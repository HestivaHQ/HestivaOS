import { ConflictException } from '@nestjs/common';
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
    const message={id:'message-1',conversationId:'c',direction:MessagingDirection.OUTBOUND,statusEvents:[{status:MessagingDeliveryStatus.PENDING,providerMessageId:null,createdAt:new Date()}]};
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

  it('allows a Messenger response only when the customer messaged within the last 24 hours', async () => {
    const now = new Date();
    const message={id:'message-1',conversationId:'conversation-1',direction:MessagingDirection.OUTBOUND,statusEvents:[{status:MessagingDeliveryStatus.PENDING,providerMessageId:null,createdAt:now}]};
    const createStatus=jest.fn(async({data}:any)=>({id:'status-2',createdAt:new Date(),...data}));
    const prisma={
      messagingMessage:{
        findUnique:jest.fn(async()=>message),
        findFirst:jest.fn(async()=>({occurredAt:new Date(now.getTime()-60*60*1000)})),
      },
      messagingMessageStatusEvent:{findFirst:jest.fn(async()=>null),count:jest.fn(async()=>1),create:createStatus},
    };
    const adapter={send:jest.fn(async()=>({providerMessageId:'mid.out-1',acceptedAt:new Date().toISOString()}))};
    const service=new MessagingService(prisma as any,{get:()=>adapter} as any);
    const result=await service.send({channel:'MESSENGER',provider:'meta',providerIdentityId:'psid-1',conversationId:'conversation-1',idempotencyKey:'key-1',kind:'TEXT',text:'Reply'});
    expect(result.providerMessageId).toBe('mid.out-1');
    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('blocks Messenger provider delivery when the latest inbound message is outside 24 hours', async () => {
    const now = new Date();
    const message={id:'message-1',conversationId:'conversation-1',direction:MessagingDirection.OUTBOUND,statusEvents:[{status:MessagingDeliveryStatus.PENDING,providerMessageId:null,createdAt:now}]};
    const prisma={messagingMessage:{findUnique:jest.fn(async()=>message),findFirst:jest.fn(async()=>({occurredAt:new Date(now.getTime()-25*60*60*1000)}))}};
    const adapter={send:jest.fn()};
    const service=new MessagingService(prisma as any,{get:()=>adapter} as any);
    await expect(service.send({channel:'MESSENGER',provider:'meta',providerIdentityId:'psid-1',conversationId:'conversation-1',idempotencyKey:'key-1',kind:'TEXT',text:'Too late'})).rejects.toBeInstanceOf(ConflictException);
    expect(adapter.send).not.toHaveBeenCalled();
  });

  it('hides Messenger from available customer channels when its reply window has expired', async () => {
    const now = new Date();
    const rows=[
      {id:'messenger-recent',channel:'MESSENGER',provider:'meta',providerIdentityId:'psid-1',messages:[{occurredAt:new Date(now.getTime()-60*60*1000)}]},
      {id:'messenger-old',channel:'MESSENGER',provider:'meta',providerIdentityId:'psid-2',messages:[{occurredAt:new Date(now.getTime()-25*60*60*1000)}]},
      {id:'whatsapp',channel:'WHATSAPP',provider:'meta',providerIdentityId:'2782',messages:[]},
    ];
    const prisma={messagingConversation:{findMany:jest.fn(async()=>rows)}};
    const service=new MessagingService(prisma as any,{get:()=>({send:jest.fn()})} as any);
    const available=await service.availableCustomerConversations('customer-1');
    expect(available.map((row:any)=>row.id)).toEqual(['messenger-recent','whatsapp']);
  });

  it('preserves sent, delivered and read as provider-specific history without changing generic acceptance semantics', async () => {
    const message={id:'message-1',direction:MessagingDirection.OUTBOUND};
    const statusRows:any[]=[];
    const create=jest.fn(async({data}:any)=>{const row={id:`status-${statusRows.length+1}`,createdAt:new Date(),...data};statusRows.push(row);return row;});
    const upsert=jest.fn(async({create:data}:any)=>({id:'provider-status',createdAt:new Date(),...data}));
    const update=jest.fn(async()=>({}));
    const prisma={
      messagingMessage:{findUnique:jest.fn(async()=>message)},
      messagingMessageStatusEvent:{findFirst:jest.fn(async({where}:any)=>statusRows.find(row=>row.messageId===where.messageId&&row.status===where.status&&row.providerMessageId===(where.providerMessageId??null))??null),create},
      messagingProviderStatusEvent:{upsert},
      workOrderAccessRecovery:{findUnique:jest.fn(async()=>({id:'recovery-1',status:WorkOrderAccessRecoveryStatus.PENDING_SEND,sentAt:null})),update}
    };
    const service=new MessagingService(prisma as any,{} as any);
    const common={providerMessageId:'wamid.out-1',correlationId:'key-1'};
    await service.persistWhatsAppStatus({...common,providerStatus:'sent',occurredAt:'2026-08-20T15:00:00.000Z'});
    await service.persistWhatsAppStatus({...common,providerStatus:'delivered',occurredAt:'2026-08-20T15:00:05.000Z'});
    await service.persistWhatsAppStatus({...common,providerStatus:'read',occurredAt:'2026-08-20T15:01:00.000Z'});

    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert).toHaveBeenNthCalledWith(1,expect.objectContaining({create:expect.objectContaining({messageId:'message-1',provider:'meta',providerMessageId:'wamid.out-1',providerStatus:'sent',occurredAt:new Date('2026-08-20T15:00:00.000Z')})}));
    expect(upsert).toHaveBeenNthCalledWith(2,expect.objectContaining({create:expect.objectContaining({providerStatus:'delivered',occurredAt:new Date('2026-08-20T15:00:05.000Z')})}));
    expect(upsert).toHaveBeenNthCalledWith(3,expect.objectContaining({create:expect.objectContaining({providerStatus:'read',occurredAt:new Date('2026-08-20T15:01:00.000Z')})}));
    expect(statusRows.filter(row=>row.status===MessagingDeliveryStatus.ACCEPTED)).toHaveLength(1);
    expect(update).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({status:WorkOrderAccessRecoveryStatus.SENT})}));
  });

  it('keeps explicit provider failure in both provider-specific history and generic retry state', async () => {
    const message={id:'message-1',direction:MessagingDirection.OUTBOUND};
    const upsert=jest.fn(async({create:data}:any)=>({id:'provider-status',createdAt:new Date(),...data}));
    const create=jest.fn(async({data}:any)=>({id:'status-new',createdAt:new Date(),...data}));
    const update=jest.fn(async()=>({}));
    const prisma={messagingMessage:{findUnique:jest.fn(async()=>message)},messagingMessageStatusEvent:{findFirst:jest.fn(async()=>null),create},messagingProviderStatusEvent:{upsert},workOrderAccessRecovery:{findUnique:jest.fn(async()=>({id:'recovery-1',status:WorkOrderAccessRecoveryStatus.PENDING_SEND,sentAt:null})),update}};
    const service=new MessagingService(prisma as any,{} as any);
    await service.persistWhatsAppStatus({providerMessageId:'wamid.out-1',correlationId:'key-1',providerStatus:'failed',occurredAt:'2026-08-20T15:00:00.000Z'});
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({providerStatus:'failed'})}));
    expect(create).toHaveBeenCalledWith({data:{messageId:'message-1',status:MessagingDeliveryStatus.FAILED,providerMessageId:'wamid.out-1'}});
    expect(update).toHaveBeenCalledWith(expect.objectContaining({data:{status:WorkOrderAccessRecoveryStatus.SEND_FAILED}}));
  });
});
