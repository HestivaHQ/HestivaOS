import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CleaningJobTemplateStatus, Prisma, ServiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCleaningJobTemplateInput = {
  name: string;
  description?: string;
  estimatedDurationMinutes?: number;
  status?: CleaningJobTemplateStatus;
  serviceIds?: string[];
};

export type UpdateCleaningJobTemplateInput = Partial<CreateCleaningJobTemplateInput>;

@Injectable()
export class CleaningJobTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCleaningJobTemplateInput) {
    if (!input.name?.trim()) throw new BadRequestException('name is required.');
    await this.validateServices(input.serviceIds ?? []);
    return this.prisma.cleaningJobTemplate.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        status: input.status,
        services: { connect: (input.serviceIds ?? []).map((id) => ({ id })) },
      },
      include: { services: true },
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: CleaningJobTemplateStatus) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.CleaningJobTemplateWhereInput = {
      status,
      ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cleaningJobTemplate.findMany({ where, include: { services: true }, orderBy: { name: 'asc' }, skip: (safePage - 1) * safePageSize, take: safePageSize }),
      this.prisma.cleaningJobTemplate.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const template = await this.prisma.cleaningJobTemplate.findUnique({ where: { id }, include: { services: true } });
    if (!template) throw new NotFoundException('Cleaning job template not found.');
    return template;
  }

  async update(id: string, input: UpdateCleaningJobTemplateInput) {
    await this.findOne(id);
    if (input.serviceIds) await this.validateServices(input.serviceIds);
    return this.prisma.cleaningJobTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.estimatedDurationMinutes !== undefined ? { estimatedDurationMinutes: input.estimatedDurationMinutes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.serviceIds !== undefined ? { services: { set: input.serviceIds.map((serviceId) => ({ id: serviceId })) } } : {}),
      },
      include: { services: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.cleaningJobTemplate.delete({ where: { id } });
  }

  private async validateServices(serviceIds: string[]) {
    if (!serviceIds.length) return;
    const services = await this.prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, status: true } });
    if (services.length !== new Set(serviceIds).size) throw new NotFoundException('One or more services were not found.');
    if (services.some((service) => service.status === ServiceStatus.INACTIVE)) throw new BadRequestException('Inactive services cannot be added to a cleaning job template.');
  }
}