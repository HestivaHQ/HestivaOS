import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateServiceInput = {
  name: string;
  description?: string;
  defaultDurationMinutes?: number;
  status?: ServiceStatus;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateServiceInput) {
    if (!input.name?.trim()) throw new BadRequestException('name is required.');
    if (input.defaultDurationMinutes !== undefined && input.defaultDurationMinutes <= 0) {
      throw new BadRequestException('defaultDurationMinutes must be greater than zero.');
    }

    return this.prisma.service.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        defaultDurationMinutes: input.defaultDurationMinutes ?? null,
        status: input.status,
      },
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: ServiceStatus) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.ServiceWhereInput = {
      status,
      ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({ where, orderBy: { name: 'asc' }, skip: (safePage - 1) * safePageSize, take: safePageSize }),
      this.prisma.service.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found.');
    return service;
  }

  async update(id: string, input: UpdateServiceInput) {
    await this.findOne(id);
    if (input.name !== undefined && !input.name.trim()) throw new BadRequestException('name cannot be empty.');
    if (input.defaultDurationMinutes !== undefined && input.defaultDurationMinutes <= 0) {
      throw new BadRequestException('defaultDurationMinutes must be greater than zero.');
    }
    return this.prisma.service.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.defaultDurationMinutes !== undefined ? { defaultDurationMinutes: input.defaultDurationMinutes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.service.delete({ where: { id } });
  }
}
