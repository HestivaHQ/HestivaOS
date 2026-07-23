import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TechnicianStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateTechnicianInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  skills?: string[];
  notes?: string;
  status?: TechnicianStatus;
};

export type UpdateTechnicianInput = Partial<CreateTechnicianInput>;

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateTechnicianInput) {
    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new BadRequestException('firstName and lastName are required.');
    }
    return this.prisma.technician.create({
      data: {
        ...this.clean(input),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
      },
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: TechnicianStatus) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.TechnicianWhereInput = {
      status,
      ...(term ? { OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.technician.findMany({ where, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], skip: (safePage - 1) * safePageSize, take: safePageSize }),
      this.prisma.technician.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const technician = await this.prisma.technician.findUnique({ where: { id } });
    if (!technician) throw new NotFoundException('Technician not found.');
    return technician;
  }

  async update(id: string, input: UpdateTechnicianInput) {
    await this.findOne(id);
    return this.prisma.technician.update({ where: { id }, data: this.clean(input) });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.technician.delete({ where: { id } });
  }

  private clean(input: UpdateTechnicianInput) {
    return {
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
      ...(input.skills !== undefined ? { skills: input.skills.map((skill) => skill.trim()).filter(Boolean) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };
  }
}
