import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ExecutionEvidenceAccessService } from './execution-evidence-access.service';

const createSignedUrl = jest.fn();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { from: () => ({ createSignedUrl }) } }) }));

describe('ExecutionEvidenceAccessService', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-role-key';
    createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: 'https://signed.example/object?token=private' }, error: null });
  });

  function harness(evidence: unknown = { id: 'evidence-1', storagePath: 'work/scope/section/evidence.webp', syncState: 'SERVER_ACKNOWLEDGED' }, assignment: unknown = { technicianId: 'tech-1' }) {
    const prisma = { executionSectionEvidence: { findFirst: jest.fn().mockResolvedValue(evidence) }, employeeRecord: { findFirst: jest.fn().mockResolvedValue(assignment) } } as any;
    return { service: new ExecutionEvidenceAccessService(prisma), prisma };
  }

  it('signs acknowledged evidence briefly without returning its storage path', async () => {
    const { service } = harness();
    const result = await service.managementAccess('work-1', 'evidence-1', UserRole.SUPERVISOR);
    expect(createSignedUrl).toHaveBeenCalledWith('work/scope/section/evidence.webp', 60);
    expect(result.url).toContain('token=private');
    expect(JSON.stringify(result)).not.toContain('storagePath');
  });

  it('denies non-management roles and wrong Work Order evidence', async () => {
    const { service } = harness(null);
    await expect(service.managementAccess('work-1', 'evidence-1', UserRole.OPERATIONS_MANAGER)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.managementAccess('work-1', 'evidence-1', UserRole.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires current Technician assignment and completed upload acknowledgement', async () => {
    const unassigned = harness(undefined, null);
    await expect(unassigned.service.technicianAccess('user-1', 'work-1', 'evidence-1')).rejects.toBeInstanceOf(NotFoundException);
    const pending = harness({ id: 'evidence-1', storagePath: null, syncState: 'QUEUED' });
    await expect(pending.service.technicianAccess('user-1', 'work-1', 'evidence-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
