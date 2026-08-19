import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path: string) => readFileSync(join(process.cwd(), 'src', path), 'utf8');

describe('private execution evidence projections', () => {
  it('does not expose raw storage paths through broad Work Order, incident or mismatch projections', () => {
    expect(source('work-orders/work-orders.service.ts')).not.toMatch(/evidence:\s*true/);
    expect(source('work-orders/work-order-incident.service.ts')).not.toMatch(/evidence:\{select:\{[^}]*storagePath/);
    expect(source('work-orders/work-order-scope-mismatch.service.ts')).not.toMatch(/evidence:\s*\{\s*select:\s*\{[^}]*storagePath/);
  });

  it('keeps signed access on explicit role and assignment-scoped routes', () => {
    expect(source('work-orders/work-orders.controller.ts')).toContain('@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)');
    expect(source('technician-jobs/technician-jobs.controller.ts')).toContain('evidenceAccess.technicianAccess');
  });
});
