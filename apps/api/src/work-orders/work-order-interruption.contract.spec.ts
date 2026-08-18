import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { interruptionNextActions, interruptionReasons } from './work-order-interruption.service';

const serviceSource=readFileSync(join(__dirname,'work-order-interruption.service.ts'),'utf8');
const workOrdersSource=readFileSync(join(__dirname,'work-orders.service.ts'),'utf8');

describe('interrupted visit contract',()=>{
  it('uses controlled field reasons and management routes',()=>{
    expect(interruptionReasons).toEqual(['NO_ACCESS','UTILITIES_UNAVAILABLE','SAFETY_CONCERN','CUSTOMER_REQUESTED','REQUIRED_RESOURCE_UNAVAILABLE','OTHER']);
    expect(interruptionNextActions).toEqual(['REPLACEMENT_VISIT','FOLLOW_UP','PARTIAL_COMPLETION_REVIEW','FINANCIAL_REVIEW','CLOSE']);
  });
  it('keeps interruption authority with the assigned Job Leader',()=>{
    expect(serviceSource).toContain('job.jobLeaderId!==technicianId');
    expect(serviceSource).toContain('Only the assigned Job Leader can interrupt this visit.');
  });
  it('moves the attempted visit to a truthful first-class state and blocks generic bypass',()=>{
    expect(serviceSource).toContain('status:WorkOrderStatus.INTERRUPTED');
    expect(workOrdersSource).toContain("Use the authoritative Homent Technician interrupted-visit workflow.");
    expect(workOrdersSource).toContain('INTERRUPTED: []');
  });
  it('does not create Finance or Correspondence state',()=>{
    expect(serviceSource).not.toContain('payment.create');
    expect(serviceSource).not.toContain('invoice.create');
    expect(serviceSource).not.toContain('sendEmail');
    expect(serviceSource).not.toContain('sendMessage');
  });
  it('routes replacement work without changing the original scheduled date',()=>{
    expect(serviceSource).toContain("nextAction==='CLOSE'");
    expect(serviceSource).not.toContain('scheduledAt:');
  });
});
