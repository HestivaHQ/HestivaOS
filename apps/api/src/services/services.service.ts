import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceStatus, ServiceType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateServiceInput = {
  name: string;
  description?: string;
  defaultDurationMinutes?: number;
  status?: ServiceStatus;
  type?: ServiceType;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateServiceInput) {
    if (!input.name?.trim()) throw new BadRequestException('name is required.');
    this.validateEnums(input);
    if (input.defaultDurationMinutes !== undefined && input.defaultDurationMinutes <= 0) {
      throw new BadRequestException('defaultDurationMinutes must be greater than zero.');
    }

    const normalizedName = this.normalizeName(input.name);
    await this.assertUniqueName(normalizedName);
    return this.prisma.service.create({
      data: {
        name: input.name.trim(),
        normalizedName,
        description: input.description?.trim() || null,
        defaultDurationMinutes: input.defaultDurationMinutes ?? null,
        status: input.status,
        type: input.type,
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
    this.validateEnums(input);
    if (input.defaultDurationMinutes !== undefined && input.defaultDurationMinutes <= 0) {
      throw new BadRequestException('defaultDurationMinutes must be greater than zero.');
    }
    const normalizedName = input.name === undefined ? undefined : this.normalizeName(input.name);
    if (normalizedName) await this.assertUniqueName(normalizedName, id);
    return this.prisma.service.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim(), normalizedName } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.defaultDurationMinutes !== undefined ? { defaultDurationMinutes: input.defaultDurationMinutes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
      },
    });
  }

  private normalizeName(name: string) {
    const normalized = name.trim().toLocaleLowerCase('en-AU');
    return normalized === 'eco-friendly cleaning' ? 'eco-conscious cleaning' : normalized;
  }

  private validateEnums(input: UpdateServiceInput) {
    if (input.status !== undefined && !Object.values(ServiceStatus).includes(input.status)) throw new BadRequestException('A valid service status is required.');
    if (input.type !== undefined && !Object.values(ServiceType).includes(input.type)) throw new BadRequestException('A valid service type is required.');
  }

  private async assertUniqueName(normalizedName: string, excludeId?: string) {
    const services = await this.prisma.service.findMany({ select: { id: true, name: true, normalizedName: true } });
    const duplicate = services.find((service) => service.id !== excludeId
      && (service.normalizedName === normalizedName || this.normalizeName(service.name) === normalizedName));
    if (duplicate) throw new ConflictException('A service with this canonical name already exists.');
  }
}
