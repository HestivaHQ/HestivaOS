import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LabourAdjustmentCalculation, LabourAdjustmentKind, Prisma, WorkerPayType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateAdjustmentDefinitionInput, CreateShiftAdjustmentInput, CreateTechnicianRateInput } from './labour-costing.controller';

@Injectable()
export class LabourCostingService {
  constructor(private readonly prisma: PrismaService) {}

  async workers(date?: string) {
    const effectiveDate = date ? this.parseDate(date, 'date') : new Date();
    const technicians = await this.prisma.technician.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { rates: { orderBy: { effectiveFrom: 'desc' } } },
    });
    return technicians.map((technician) => {
      const activeRate = technician.rates.find((rate) => rate.effectiveFrom <= effectiveDate && (!rate.effectiveTo || rate.effectiveTo >= effectiveDate)) ?? null;
      return { ...technician, activeRate: activeRate ? this.serializeRate(activeRate) : null, rates: technician.rates.map((rate) => this.serializeRate(rate)) };
    });
  }

  async rates(technicianId: string) {
    await this.requireTechnician(technicianId);
    const rates = await this.prisma.technicianRate.findMany({ where: { technicianId }, orderBy: { effectiveFrom: 'desc' } });
    return rates.map((rate) => this.serializeRate(rate));
  }

  async createRate(technicianId: string, input: CreateTechnicianRateInput) {
    await this.requireTechnician(technicianId);
    const standardHoursPerDay = this.positive(input.standardHoursPerDay, 'standardHoursPerDay');
    const payType = input.payType;
    const dailyRate = input.dailyRate == null ? null : this.nonNegative(input.dailyRate, 'dailyRate');
    const hourlyRate = input.hourlyRate == null ? null : this.nonNegative(input.hourlyRate, 'hourlyRate');
    if (payType === WorkerPayType.DAILY && dailyRate == null) throw new BadRequestException('dailyRate is required for daily-paid workers.');
    if (payType === WorkerPayType.HOURLY && hourlyRate == null) throw new BadRequestException('hourlyRate is required for hourly-paid workers.');
    const effectiveFrom = this.parseDate(input.effectiveFrom, 'effectiveFrom');
    const effectiveTo = input.effectiveTo ? this.parseDate(input.effectiveTo, 'effectiveTo') : null;
    if (effectiveTo && effectiveTo <= effectiveFrom) throw new BadRequestException('effectiveTo must be after effectiveFrom.');

    const overlap = await this.prisma.technicianRate.findFirst({
      where: {
        technicianId,
        effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31T23:59:59.999Z') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
    });
    if (overlap) throw new BadRequestException('This rate period overlaps an existing worker rate. Close the previous rate period first.');

    const rate = await this.prisma.technicianRate.create({
      data: {
        technicianId,
        payType,
        dailyRate,
        hourlyRate,
        standardHoursPerDay,
        overtimeMultiplier: this.atLeastOne(input.overtimeMultiplier ?? 1.5, 'overtimeMultiplier'),
        weekendMultiplier: this.nonNegative(input.weekendMultiplier ?? 1, 'weekendMultiplier'),
        publicHolidayMultiplier: this.nonNegative(input.publicHolidayMultiplier ?? 1, 'publicHolidayMultiplier'),
        effectiveFrom,
        effectiveTo,
        reason: input.reason?.trim() || null,
      },
    });
    return this.serializeRate(rate);
  }

  async deleteRate(id: string) {
    const rate = await this.prisma.technicianRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Worker rate not found.');
    return this.prisma.technicianRate.delete({ where: { id } });
  }

  definitions() {
    return this.prisma.labourAdjustmentDefinition.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  }

  async createDefinition(input: CreateAdjustmentDefinitionInput) {
    if (!input.name?.trim()) throw new BadRequestException('Adjustment name is required.');
    try {
      return await this.prisma.labourAdjustmentDefinition.create({
        data: {
          name: input.name.trim(),
          kind: input.kind,
          calculation: input.calculation,
          amount: this.nonNegative(input.amount, 'amount'),
          notes: input.notes?.trim() || null,
          isActive: input.isActive ?? true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('An adjustment with this name already exists.');
      throw error;
    }
  }

  async updateDefinition(id: string, input: Partial<CreateAdjustmentDefinitionInput>) {
    const existing = await this.prisma.labourAdjustmentDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Adjustment definition not found.');
    return this.prisma.labourAdjustmentDefinition.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.calculation !== undefined ? { calculation: input.calculation } : {}),
        ...(input.amount !== undefined ? { amount: this.nonNegative(input.amount, 'amount') } : {}),
        ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async addShiftAdjustment(shiftId: string, input: CreateShiftAdjustmentInput) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId }, include: { crew: { include: { members: true } } } });
    if (!shift) throw new NotFoundException('Shift not found.');
    const assignedIds = new Set<string>();
    if (shift.technicianId) assignedIds.add(shift.technicianId);
    shift.crew?.members.forEach((member) => assignedIds.add(member.technicianId));
    if (!assignedIds.has(input.technicianId)) throw new BadRequestException('The worker must be assigned to this shift.');
    const definition = await this.prisma.labourAdjustmentDefinition.findUnique({ where: { id: input.definitionId } });
    if (!definition) throw new NotFoundException('Adjustment definition not found.');
    if (!definition.isActive) throw new BadRequestException('Inactive adjustments cannot be added to shifts.');
    try {
      return await this.prisma.shiftLabourAdjustment.create({
        data: {
          shiftId,
          technicianId: input.technicianId,
          definitionId: input.definitionId,
          amountOverride: input.amountOverride == null ? null : this.nonNegative(input.amountOverride, 'amountOverride'),
          notes: input.notes?.trim() || null,
        },
        include: { definition: true, technician: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('This adjustment is already applied to the worker for this shift.');
      throw error;
    }
  }

  async deleteShiftAdjustment(id: string) {
    const item = await this.prisma.shiftLabourAdjustment.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Shift adjustment not found.');
    return this.prisma.shiftLabourAdjustment.delete({ where: { id } });
  }

  async shiftCost(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        technician: true,
        crew: { include: { members: { include: { technician: true } } } },
        workOrder: { include: { customer: true, property: true } },
        labourAdjustments: { include: { definition: true, technician: true } },
      },
    });
    if (!shift) throw new NotFoundException('Shift not found.');
    const workers = new Map<string, { id: string; firstName: string; lastName: string }>();
    if (shift.technician) workers.set(shift.technician.id, shift.technician);
    shift.crew?.members.forEach((member) => workers.set(member.technician.id, member.technician));
    const plannedMinutes = Math.max(0, Math.floor((shift.endAt.getTime() - shift.startAt.getTime()) / 60000) - shift.unpaidBreakMinutes);
    const plannedHours = plannedMinutes / 60;

    const rows = await Promise.all([...workers.values()].map(async (worker) => {
      const rate = await this.prisma.technicianRate.findFirst({
        where: { technicianId: worker.id, effectiveFrom: { lte: shift.startAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: shift.startAt } }] },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!rate) return { technician: worker, rate: null, plannedHours: Number(plannedHours.toFixed(2)), baseCost: 0, overtimeCost: 0, adjustments: [], totalCost: 0, warning: 'No effective rate configured.' };
      const standardHours = Number(rate.standardHoursPerDay);
      const derivedHourlyRate = rate.payType === WorkerPayType.DAILY ? Number(rate.dailyRate ?? 0) / standardHours : Number(rate.hourlyRate ?? 0);
      const regularHours = Math.min(plannedHours, standardHours);
      const overtimeHours = Math.max(0, plannedHours - standardHours);
      const weekendMultiplier = [0, 6].includes(shift.startAt.getUTCDay()) ? Number(rate.weekendMultiplier) : 1;
      const baseCost = regularHours * derivedHourlyRate * weekendMultiplier;
      const overtimeCost = overtimeHours * derivedHourlyRate * Number(rate.overtimeMultiplier) * weekendMultiplier;
      const adjustments = shift.labourAdjustments.filter((item) => item.technicianId === worker.id).map((item) => {
        const amount = item.amountOverride == null ? Number(item.definition.amount) : Number(item.amountOverride);
        const calculatedAmount = item.definition.calculation === LabourAdjustmentCalculation.PER_HOUR ? amount * plannedHours : amount;
        const signedAmount = item.definition.kind === LabourAdjustmentKind.DEDUCTION ? -calculatedAmount : calculatedAmount;
        return { ...item, calculatedAmount: Number(signedAmount.toFixed(2)) };
      });
      const adjustmentTotal = adjustments.reduce((sum, item) => sum + item.calculatedAmount, 0);
      return {
        technician: worker,
        rate: this.serializeRate(rate),
        plannedHours: Number(plannedHours.toFixed(2)),
        derivedHourlyRate: Number(derivedHourlyRate.toFixed(2)),
        regularHours: Number(regularHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),
        baseCost: Number(baseCost.toFixed(2)),
        overtimeCost: Number(overtimeCost.toFixed(2)),
        adjustments,
        totalCost: Number((baseCost + overtimeCost + adjustmentTotal).toFixed(2)),
      };
    }));
    return { shift, plannedMinutes, plannedHours: Number(plannedHours.toFixed(2)), workers: rows, totalLabourCost: Number(rows.reduce((sum, row) => sum + row.totalCost, 0).toFixed(2)) };
  }

  private async requireTechnician(id: string) {
    const technician = await this.prisma.technician.findUnique({ where: { id } });
    if (!technician) throw new NotFoundException('Technician not found.');
    return technician;
  }

  private serializeRate<T extends { dailyRate: unknown; hourlyRate: unknown; standardHoursPerDay: unknown; overtimeMultiplier: unknown; weekendMultiplier: unknown; publicHolidayMultiplier: unknown }>(rate: T) {
    const standardHoursPerDay = Number(rate.standardHoursPerDay);
    const dailyRate = rate.dailyRate == null ? null : Number(rate.dailyRate);
    const hourlyRate = rate.hourlyRate == null ? null : Number(rate.hourlyRate);
    return {
      ...rate,
      dailyRate,
      hourlyRate,
      standardHoursPerDay,
      overtimeMultiplier: Number(rate.overtimeMultiplier),
      weekendMultiplier: Number(rate.weekendMultiplier),
      publicHolidayMultiplier: Number(rate.publicHolidayMultiplier),
      calculatedHourlyRate: hourlyRate ?? (dailyRate == null ? null : Number((dailyRate / standardHoursPerDay).toFixed(2))),
    };
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) throw new BadRequestException(`${field} must be a valid date.`);
    return date;
  }
  private nonNegative(value: number, field: string) { if (!Number.isFinite(value) || value < 0) throw new BadRequestException(`${field} must be zero or greater.`); return value; }
  private positive(value: number, field: string) { if (!Number.isFinite(value) || value <= 0) throw new BadRequestException(`${field} must be greater than zero.`); return value; }
  private atLeastOne(value: number, field: string) { if (!Number.isFinite(value) || value < 1) throw new BadRequestException(`${field} must be at least 1.`); return value; }
}