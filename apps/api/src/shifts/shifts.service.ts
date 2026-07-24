import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateShiftInput = {
  title: string;
  startAt: string;
  endAt: string;
  unpaidBreakMinutes?: number;
  crewId?: string | null;
  technicianId?: string | null;
  workOrderId?: string | null;
  location?: string;
  notes?: string;
  status?: ShiftStatus;
};

export type UpdateShiftInput = Partial<CreateShiftInput>;
export type CopyShiftInput = { startAt: string; endAt: string };

const shiftInclude = {
  crew: { include: { leader: true, members: { include: { technician: true } } } },
  technician: true,
  workOrder: { include: { customer: true, property: true } },
} as const;

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateShiftInput) {
    const data = await this.validateAndClean(input);
    await this.assertNoOverlap(data.startAt, data.endAt, data.crewId, data.technicianId);
    const shift = await this.prisma.shift.create({ data, include: shiftInclude });
    return this.withCalculatedHours(shift);
  }

  async findAll(page = 1, pageSize = 50, dateFrom?: string, dateTo?: string, status?: ShiftStatus, crewId?: string, technicianId?: string, workOrderId?: string) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const where: Prisma.ShiftWhereInput = {
      status,
      crewId,
      technicianId,
      workOrderId,
      ...(dateFrom || dateTo ? {
        startAt: {
          ...(dateFrom ? { gte: this.parseDate(dateFrom, 'dateFrom') } : {}),
          ...(dateTo ? { lte: this.parseDate(dateTo, 'dateTo') } : {}),
        },
      } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.shift.findMany({ where, include: shiftInclude, orderBy: { startAt: 'asc' }, skip: (safePage - 1) * safePageSize, take: safePageSize }),
      this.prisma.shift.count({ where }),
    ]);
    return { items: items.map((item) => this.withCalculatedHours(item)), total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, include: shiftInclude });
    if (!shift) throw new NotFoundException('Shift not found.');
    return this.withCalculatedHours(shift);
  }

  async update(id: string, input: UpdateShiftInput) {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found.');
    const data = await this.validateAndClean({
      title: input.title ?? existing.title,
      startAt: input.startAt ?? existing.startAt.toISOString(),
      endAt: input.endAt ?? existing.endAt.toISOString(),
      unpaidBreakMinutes: input.unpaidBreakMinutes ?? existing.unpaidBreakMinutes,
      crewId: input.crewId === undefined ? existing.crewId : input.crewId,
      technicianId: input.technicianId === undefined ? existing.technicianId : input.technicianId,
      workOrderId: input.workOrderId === undefined ? existing.workOrderId : input.workOrderId,
      location: input.location === undefined ? existing.location ?? undefined : input.location,
      notes: input.notes === undefined ? existing.notes ?? undefined : input.notes,
      status: input.status ?? existing.status,
    });
    await this.assertNoOverlap(data.startAt, data.endAt, data.crewId, data.technicianId, id);
    const shift = await this.prisma.shift.update({ where: { id }, data, include: shiftInclude });
    return this.withCalculatedHours(shift);
  }

  async copy(id: string, input: CopyShiftInput) {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found.');
    return this.create({
      title: existing.title,
      startAt: input.startAt,
      endAt: input.endAt,
      unpaidBreakMinutes: existing.unpaidBreakMinutes,
      crewId: existing.crewId,
      technicianId: existing.technicianId,
      workOrderId: existing.workOrderId,
      location: existing.location ?? undefined,
      notes: existing.notes ?? undefined,
      status: ShiftStatus.DRAFT,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found.');
    if (existing.status === ShiftStatus.COMPLETED) throw new BadRequestException('Completed shifts cannot be deleted. Cancel the shift or retain it for history.');
    return this.prisma.shift.delete({ where: { id } });
  }

  private async validateAndClean(input: CreateShiftInput) {
    if (!input.title?.trim()) throw new BadRequestException('Shift title is required.');
    const startAt = this.parseDate(input.startAt, 'startAt');
    const endAt = this.parseDate(input.endAt, 'endAt');
    if (endAt <= startAt) throw new BadRequestException('Shift end time must be after the start time.');
    const unpaidBreakMinutes = Math.max(0, Math.trunc(input.unpaidBreakMinutes ?? 0));
    const durationMinutes = Math.floor((endAt.getTime() - startAt.getTime()) / 60000);
    if (unpaidBreakMinutes >= durationMinutes) throw new BadRequestException('Unpaid break cannot equal or exceed the full shift duration.');
    const crewId = input.crewId || null;
    const technicianId = input.technicianId || null;
    if (!crewId && !technicianId) throw new BadRequestException('Assign a crew or technician to the shift.');

    const [crew, technician, workOrder] = await Promise.all([
      crewId ? this.prisma.crew.findUnique({ where: { id: crewId }, include: { members: true } }) : Promise.resolve(null),
      technicianId ? this.prisma.technician.findUnique({ where: { id: technicianId } }) : Promise.resolve(null),
      input.workOrderId ? this.prisma.workOrder.findUnique({ where: { id: input.workOrderId } }) : Promise.resolve(null),
    ]);
    if (crewId && !crew) throw new NotFoundException('Crew not found.');
    if (crew?.status === 'INACTIVE') throw new BadRequestException('Inactive crews cannot be scheduled.');
    if (technicianId && !technician) throw new NotFoundException('Technician not found.');
    if (technician?.status === 'INACTIVE') throw new BadRequestException('Inactive technicians cannot be scheduled.');
    if (crew && technicianId && !crew.members.some((member) => member.technicianId === technicianId)) {
      throw new BadRequestException('The designated technician must belong to the selected crew.');
    }
    if (input.workOrderId && !workOrder) throw new NotFoundException('Work order not found.');

    return {
      title: input.title.trim(), startAt, endAt, unpaidBreakMinutes, crewId, technicianId,
      workOrderId: input.workOrderId || null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status ?? ShiftStatus.DRAFT,
    };
  }

  private async assertNoOverlap(startAt: Date, endAt: Date, crewId: string | null, technicianId: string | null, excludeId?: string) {
    const candidateTechnicianIds = await this.assignmentTechnicianIds(crewId, technicianId);
    const overlapping = await this.prisma.shift.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        status: { not: ShiftStatus.CANCELLED },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: { crew: { include: { members: true } } },
    });
    const conflict = overlapping.find((shift) => {
      if (crewId && shift.crewId === crewId) return true;
      const existingIds = new Set<string>();
      if (shift.technicianId) existingIds.add(shift.technicianId);
      shift.crew?.members.forEach((member) => existingIds.add(member.technicianId));
      return candidateTechnicianIds.some((id) => existingIds.has(id));
    });
    if (conflict) throw new BadRequestException(`Shift overlaps with "${conflict.title}".`);
  }

  private async assignmentTechnicianIds(crewId: string | null, technicianId: string | null) {
    const ids = new Set<string>();
    if (technicianId) ids.add(technicianId);
    if (crewId) {
      const members = await this.prisma.crewMember.findMany({ where: { crewId }, select: { technicianId: true } });
      members.forEach((member) => ids.add(member.technicianId));
    }
    return [...ids];
  }

  private withCalculatedHours<T extends { startAt: Date; endAt: Date; unpaidBreakMinutes: number }>(shift: T) {
    const grossMinutes = Math.max(0, Math.floor((shift.endAt.getTime() - shift.startAt.getTime()) / 60000));
    const plannedMinutes = Math.max(0, grossMinutes - shift.unpaidBreakMinutes);
    return { ...shift, grossMinutes, plannedMinutes, plannedHours: Number((plannedMinutes / 60).toFixed(2)) };
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) throw new BadRequestException(`${field} must be a valid date and time.`);
    return date;
  }
}
