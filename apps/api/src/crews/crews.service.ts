import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CrewStatus, Prisma, TechnicianStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCrewInput = {
  name: string;
  description?: string;
  leaderId?: string | null;
  memberIds?: string[];
  status?: CrewStatus;
};

export type UpdateCrewInput = Partial<CreateCrewInput>;

const crewInclude = {
  leader: true,
  members: { include: { technician: true }, orderBy: { technician: { lastName: 'asc' as const } } },
  _count: { select: { workOrders: true } },
} as const;

@Injectable()
export class CrewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCrewInput) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Crew name is required.');
    const memberIds = this.uniqueIds(input.memberIds ?? []);
    await this.validateName(name);
    await this.validateMembers(memberIds);
    this.validateLeader(input.leaderId, memberIds);

    return this.prisma.crew.create({
      data: {
        name,
        description: input.description?.trim() || null,
        status: input.status ?? CrewStatus.ACTIVE,
        leaderId: input.leaderId || null,
        members: { create: memberIds.map((technicianId) => ({ technicianId })) },
      },
      include: crewInclude,
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: CrewStatus) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.CrewWhereInput = {
      status,
      ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { members: { some: { technician: { OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
        ] } } } },
      ] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crew.findMany({ where, include: crewInclude, orderBy: { name: 'asc' }, skip: (safePage - 1) * safePageSize, take: safePageSize }),
      this.prisma.crew.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const crew = await this.prisma.crew.findUnique({ where: { id }, include: crewInclude });
    if (!crew) throw new NotFoundException('Crew not found.');
    return crew;
  }

  async update(id: string, input: UpdateCrewInput) {
    const existing = await this.findOne(id);
    const name = input.name?.trim();
    if (input.name !== undefined && !name) throw new BadRequestException('Crew name is required.');
    if (name && name !== existing.name) await this.validateName(name, id);

    const memberIds = input.memberIds !== undefined
      ? this.uniqueIds(input.memberIds)
      : existing.members.map((member) => member.technicianId);
    await this.validateMembers(memberIds, id);
    const leaderId = input.leaderId !== undefined ? input.leaderId : existing.leaderId;
    this.validateLeader(leaderId, memberIds);

    return this.prisma.$transaction(async (tx) => {
      if (input.memberIds !== undefined) {
        await tx.crewMember.deleteMany({ where: { crewId: id } });
        if (memberIds.length) await tx.crewMember.createMany({ data: memberIds.map((technicianId) => ({ crewId: id, technicianId })) });
      }
      return tx.crew.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.leaderId !== undefined || input.memberIds !== undefined ? { leaderId: leaderId || null } : {}),
        },
        include: crewInclude,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const activeWorkOrders = await this.prisma.workOrder.count({
      where: { crewId: id, status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED, WorkOrderStatus.CANCELLED] } },
    });
    if (activeWorkOrders) throw new ConflictException('Crew cannot be deleted while assigned to active work orders. Archive the crew instead.');
    return this.prisma.crew.delete({ where: { id }, include: crewInclude });
  }

  private async validateName(name: string, excludeId?: string) {
    const duplicate = await this.prisma.crew.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (duplicate) throw new ConflictException('A crew with this name already exists.');
  }

  private async validateMembers(memberIds: string[], currentCrewId?: string) {
    if (!memberIds.length) return;
    const technicians = await this.prisma.technician.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, status: true, crewMembership: { select: { crewId: true, crew: { select: { status: true } } } } },
    });
    if (technicians.length !== memberIds.length) throw new NotFoundException('One or more technicians were not found.');
    const inactive = technicians.find((technician) => technician.status === TechnicianStatus.INACTIVE);
    if (inactive) throw new BadRequestException('Inactive technicians cannot be added to an active crew.');
    const assignedElsewhere = technicians.find((technician) => technician.crewMembership && technician.crewMembership.crewId !== currentCrewId && technician.crewMembership.crew.status === CrewStatus.ACTIVE);
    if (assignedElsewhere) throw new ConflictException('A technician cannot belong to more than one active crew.');
  }

  private validateLeader(leaderId: string | null | undefined, memberIds: string[]) {
    if (leaderId && !memberIds.includes(leaderId)) throw new BadRequestException('Crew leader must be included in the crew members.');
  }

  private uniqueIds(ids: string[]) {
    return [...new Set(ids.filter(Boolean))];
  }
}
