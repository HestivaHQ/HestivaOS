import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { ScopeMismatchResolutionInput, validateScopeMismatchResolution } from './work-order-scope-mismatch.policy';

export type ResolveScopeMismatchInput = ScopeMismatchResolutionInput & { operationId: string };

type ResolutionRow = {
  id: string;
  operation_id: string;
  work_order_id: string;
  outcome_event_id: string;
  actor_id: string;
  resolution: string;
  customer_approval_status: string;
  customer_approval_method: string | null;
  customer_approved_at: Date | null;
  proposed_amount_minor: number | null;
  capacity_reviewed: boolean;
  note: string | null;
  request_hash: string;
  created_at: Date;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class WorkOrderScopeMismatchService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true, reference: true, startedScopeRevisionId: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');

    const mismatches = await this.prisma.executionSectionOutcomeEvent.findMany({
      where: {
        reason: 'SCOPE_OR_CONDITION_MISMATCH',
        section: { scopeRevision: { workOrderId } },
      },
      orderBy: { serverReceivedAt: 'asc' },
      select: {
        id: true,
        operationId: true,
        outcome: true,
        note: true,
        attentionLevel: true,
        fieldRecordedAt: true,
        serverReceivedAt: true,
        technician: { select: { id: true, firstName: true, lastName: true } },
        section: { select: { id: true, stableKey: true, title: true, scopeRevisionId: true } },
        evidence: { select: { id: true, localEvidenceId: true, syncState: true, storagePath: true, capturedAt: true, serverAcknowledgedAt: true } },
      },
    });

    const resolutions = await this.resolutionsFor(workOrderId);
    const byEvent = new Map<string, ResolutionRow[]>();
    for (const row of resolutions) byEvent.set(row.outcome_event_id, [...(byEvent.get(row.outcome_event_id) ?? []), row]);

    return {
      workOrderId,
      reference: workOrder.reference,
      frozenScopeRevisionId: workOrder.startedScopeRevisionId,
      mismatches: mismatches.map((item) => {
        const history = byEvent.get(item.id) ?? [];
        const latest = history.at(-1) ?? null;
        return {
          ...item,
          resolutionHistory: history.map((row) => this.serialize(row)),
          latestResolution: latest ? this.serialize(latest) : null,
          additionalWorkMayBegin: latest?.resolution === 'CHARGEABLE_ADDITIONAL_WORK' && latest.customer_approval_status === 'APPROVED',
        };
      }),
      boundaries: {
        technicianAuthority: 'Technicians report the mismatch and evidence only; they do not set price or promise chargeable work.',
        finance: 'This workflow records a proposed amount only. It does not create a payment obligation or alter financial clearance.',
        correspondence: 'Customer approval evidence may be recorded manually. This workflow does not send customer correspondence.',
        frozenScope: 'The frozen Execution Scope remains unchanged historical truth. Approved additional work is recorded as a management resolution, not silently rewritten into the original scope.',
      },
    };
  }

  async resolve(workOrderId: string, outcomeEventId: string, input: ResolveScopeMismatchInput, actorId: string) {
    if (!UUID_PATTERN.test(input.operationId ?? '')) throw new BadRequestException('operationId must be a UUID generated once for this resolution.');
    let normalized: ReturnType<typeof validateScopeMismatchResolution>;
    try { normalized = validateScopeMismatchResolution(input); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid scope mismatch resolution.'); }

    const requestHash = createHash('sha256').update(JSON.stringify({ outcomeEventId, ...normalized, customerApprovedAt: normalized.customerApprovedAt?.toISOString() ?? null })).digest('hex');
    const recovered = await this.findOperation(input.operationId);
    if (recovered) return this.recover(recovered, requestHash);

    const mismatch = await this.prisma.executionSectionOutcomeEvent.findFirst({
      where: { id: outcomeEventId, reason: 'SCOPE_OR_CONDITION_MISMATCH', section: { scopeRevision: { workOrderId } } },
      select: { id: true, section: { select: { stableKey: true, title: true } } },
    });
    if (!mismatch) throw new NotFoundException('Scope mismatch event was not found for this Work Order.');

    try {
      const id = randomUUID();
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "work_order_scope_mismatch_resolutions" (
          "id", "operation_id", "work_order_id", "outcome_event_id", "actor_id", "resolution",
          "customer_approval_status", "customer_approval_method", "customer_approved_at", "proposed_amount_minor",
          "capacity_reviewed", "note", "request_hash"
        ) VALUES (
          CAST(${id} AS UUID), CAST(${input.operationId} AS UUID), CAST(${workOrderId} AS UUID), CAST(${outcomeEventId} AS UUID), CAST(${actorId} AS UUID),
          ${normalized.resolution}, ${normalized.customerApprovalStatus}, ${normalized.customerApprovalMethod}, ${normalized.customerApprovedAt},
          ${normalized.proposedAmountMinor}, ${normalized.capacityReviewed}, ${normalized.note}, ${requestHash}
        )
      `);
      await this.prisma.workOrderActivity.create({
        data: {
          workOrderId,
          type: 'SECTION_OUTCOME_RECORDED',
          actorId,
          note: `Scope mismatch ${mismatch.section.stableKey} management resolution: ${normalized.resolution}.`,
        },
      });
    } catch (error) {
      const afterError = await this.findOperation(input.operationId);
      if (afterError) return this.recover(afterError, requestHash);
      throw error;
    }

    const saved = await this.findOperation(input.operationId);
    if (!saved) throw new ConflictException('Scope mismatch resolution could not be recovered after commit.');
    return { resolution: this.serialize(saved), replayed: false, additionalWorkMayBegin: normalized.additionalWorkMayBegin };
  }

  private async resolutionsFor(workOrderId: string) {
    return this.prisma.$queryRaw<ResolutionRow[]>(Prisma.sql`
      SELECT * FROM "work_order_scope_mismatch_resolutions"
      WHERE "work_order_id" = CAST(${workOrderId} AS UUID)
      ORDER BY "created_at" ASC, "id" ASC
    `);
  }

  private async findOperation(operationId: string) {
    const rows = await this.prisma.$queryRaw<ResolutionRow[]>(Prisma.sql`
      SELECT * FROM "work_order_scope_mismatch_resolutions"
      WHERE "operation_id" = CAST(${operationId} AS UUID)
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private recover(row: ResolutionRow, requestHash: string) {
    if (row.request_hash !== requestHash) throw new ConflictException('This scope mismatch operation ID was already used for a different resolution.');
    return {
      resolution: this.serialize(row),
      replayed: true,
      additionalWorkMayBegin: row.resolution === 'CHARGEABLE_ADDITIONAL_WORK' && row.customer_approval_status === 'APPROVED',
    };
  }

  private serialize(row: ResolutionRow) {
    return {
      id: row.id,
      operationId: row.operation_id,
      workOrderId: row.work_order_id,
      outcomeEventId: row.outcome_event_id,
      actorId: row.actor_id,
      resolution: row.resolution,
      customerApprovalStatus: row.customer_approval_status,
      customerApprovalMethod: row.customer_approval_method,
      customerApprovedAt: row.customer_approved_at?.toISOString() ?? null,
      proposedAmountMinor: row.proposed_amount_minor,
      capacityReviewed: row.capacity_reviewed,
      note: row.note,
      createdAt: row.created_at.toISOString(),
    };
  }
}
