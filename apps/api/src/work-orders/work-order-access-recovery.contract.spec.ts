import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source=(name:string)=>readFileSync(join(process.cwd(),'src',name),'utf8');
describe('Phase 3D authority and privacy contract',()=>{
  const controller=source('work-orders/work-orders.controller.ts');
  const recovery=source('work-orders/work-order-access-recovery.service.ts');
  const messaging=source('messaging/messaging.service.ts');
  it('keeps every recovery command Admin-only',()=>{
    expect(controller).toMatch(/@Post\(':id\/access-recovery'\)\s+@Roles\(UserRole\.ADMIN\)/);
    expect(controller).toMatch(/credential-candidate'\)\s+@Roles\(UserRole\.ADMIN\)/);
  });
  it('uses a constrained canonical conversation and stable outbound idempotency key',()=>{
    expect(recovery).toContain("available.some(c=>c.id===input.conversationId)");
    expect(recovery).toContain('access-recovery:${input.requestId}');
    expect(recovery).toContain('idempotencyKey:recovery.outboundMessage.idempotencyKey!');
  });
  it('does not include protected values or internal state in the outbound template',()=>{
    const template=recovery.match(/const text=`([^`]+)`/)?.[1]??'';
    expect(template).toContain('access information needed');
    expect(template).not.toMatch(/credential|priority|work.?order|finance|internal|PIN|code/i);
  });
  it('associates inbound responses without accepting them or changing lifecycle',()=>{
    expect(messaging).toContain('RESPONSE_REQUIRES_REVIEW');
    expect(messaging).not.toContain('WorkOrderAccessReadiness.RECEIVED');
    expect(recovery).toContain('sourceMessageId:recovery.responseMessage.id');
    expect(recovery).toContain('Access facts changed after this request');
    expect(recovery).not.toMatch(/workOrder\.(update|delete)\(|financeService|invoiceService|paymentService/i);
  });
});
