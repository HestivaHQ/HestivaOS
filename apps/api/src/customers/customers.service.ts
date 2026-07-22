import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCustomerInput = {
  ownerId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: CustomerStatus;
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'ownerId'>>;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerInput) {
    if (!input.ownerId || !input.name?.trim()) {
      throw new BadRequestException('ownerId and name are required.');
    }

    return this.prisma.customer.create({
      data: {
        ownerId: input.ownerId,
        name: input.name.trim(),
        contactName: input.contactName?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        status: input.status,
      },
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: CustomerStatus) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const where: Prisma.CustomerWhereInput = {
      status,
      ...(search?.trim()
        ? {
            OR: [
              { name: { contains: search.trim(), mode: 'insensitive' } },
              { contactName: { contains: search.trim(), mode: 'insensitive' } },
              { email: { contains: search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: { _count: { select: { properties: true, workOrders: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { properties: true, _count: { select: { workOrders: true } } },
    });

    if (!customer) throw new NotFoundException('Customer not found.');
    return customer;
  }

  async update(id: string, input: UpdateCustomerInput) {
    await this.findOne(id);

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.contactName !== undefined ? { contactName: input.contactName.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }
}
