import { SupervisorOperationsService } from './supervisor-operations.service';
import { describe, expect, it, jest } from '@jest/globals';

describe('SupervisorOperationsService', () => {
  it('projects execution counts without storage paths or credential data', async () => {
    const findMany = jest.fn<() => Promise<any[]>>().mockResolvedValue([{ id:'wo',reference:'WO-1',title:'WO-1',status:'COMPLETED',scheduledAt:new Date(),accessReadiness:'REQUIRED_MISSING',startedAt:new Date(),completionAcceptedAt:new Date(),completionAcknowledgedAt:null,customer:{name:'Customer',contactName:null},property:{name:'Property',city:'Cape Town'},service:{name:'Cleaning'},crew:null,assignedTechnicians:[],jobLeader:null,startedScopeRevision:{sections:[{currentOutcome:'COMPLETED',currentOutcomeEvent:null,evidence:[{syncState:'SERVER_ACKNOWLEDGED',storagePath:'must-not-leak'}]}]},incidents:[] }]);
    const prisma = { workOrder: { findMany } };
    const result = await new SupervisorOperationsService(prisma as never).overview();
    expect(result.workOrders[0]).toMatchObject({ execution:{completedSections:1,totalSections:1,evidenceCount:1,evidencePendingCount:0}, completion:{acknowledgementRequired:true} });
    expect(JSON.stringify(result)).not.toContain('storagePath');
    expect(JSON.stringify(result)).not.toContain('credential');
  });
});
