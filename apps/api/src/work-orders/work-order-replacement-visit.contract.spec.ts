import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source=readFileSync(join(__dirname,'work-order-replacement-visit.service.ts'),'utf8');
const controller=readFileSync(join(__dirname,'work-order-interruptions.controller.ts'),'utf8');

describe('replacement visit contract',()=>{
  it('requires an interrupted visit routed to replacement',()=>{
    expect(source).toContain("source.status!==WorkOrderStatus.INTERRUPTED");
    expect(source).toContain("latestRoute?.next_action!=='REPLACEMENT_VISIT'");
  });
  it('creates a fresh unassigned Work Order and preserves source history',()=>{
    expect(source).toContain('status:WorkOrderStatus.NEW');
    expect(source).not.toContain('technicianId:source.technicianId');
    expect(source).not.toContain('jobLeaderId:source.jobLeaderId');
    expect(source).not.toContain('startedScopeRevisionId');
    expect(source).not.toContain('completionOperationId');
    expect(source).not.toContain('temporaryAccessCredentials');
    expect(source).not.toContain('executionEvidence');
    expect(source).not.toContain('preferredTimeWindow:source.preferredTimeWindow');
    expect(source).not.toContain('alternativeDate:source.alternativeDate');
  });
  it('links exactly one replacement to the interrupted attempt and supports idempotent replay',()=>{
    expect(source).toContain('byInterruption(interruption.id');
    expect(source).toContain('byOperation(input.operationId');
    expect(source).toContain('Replacement operation ID is already bound to a different request.');
    expect(source).toContain('replacementSummary(row.replacement_work_order_id');
  });
  it('locks management rerouting once replacement creation is authoritative',()=>{
    expect(controller).toContain('await this.replacements.detail(id)');
    expect(controller).toContain('can no longer be rerouted');
  });
  it('does not invent Finance or customer correspondence behavior',()=>{
    expect(source).not.toContain('payment.create');
    expect(source).not.toContain('invoice.create');
    expect(source).not.toContain('refund');
    expect(source).not.toContain('sendEmail');
    expect(source).not.toContain('sendMessage');
  });
  it('resolves the interruption attention condition only after the replacement exists',()=>{
    expect(source).toContain("reason:'REPLACEMENT_VISIT_CREATED'");
    expect(source.indexOf('tx.workOrder.create')).toBeLessThan(source.indexOf("reason:'REPLACEMENT_VISIT_CREATED'"));
  });
});
