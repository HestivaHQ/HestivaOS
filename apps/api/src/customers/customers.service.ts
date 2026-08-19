import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCustomerInput = {
  ownerId: string;
  name?: string;
  contactName: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: CustomerStatus;
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'ownerId'>>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerInput) {
    if (!input.ownerId || !input.contactName?.trim()) {
      throw new BadRequestException('ownerId and contactName are required.');
    }
    this.validateStatus(input.status);

    return this.prisma.customer.create({
      data: {
        ownerId: input.ownerId,
        // Keep the non-null historical field compatible without asking users
        // to enter the same human name twice.
        name: input.contactName.trim(),
        contactName: input.contactName.trim(),
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        status: input.status,
      },
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: CustomerStatus) {
    this.validateStatus(status);
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.CustomerWhereInput = {
      status,
      ...(term
        ? {
            OR: [
              ...(uuidPattern.test(term) ? [{ id: term }] : []),
              { name: { contains: term, mode: 'insensitive' } },
              { contactName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { phone: { contains: term, mode: 'insensitive' } },
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
    this.validateStatus(input.status);
    if (input.contactName !== undefined && !input.contactName.trim()) {
      throw new BadRequestException('contactName is required.');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(input.contactName !== undefined
          ? { name: input.contactName.trim(), contactName: input.contactName.trim() || null }
          : {}),
        ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  }

  selectorOptions(search?: string) {
    const term = search?.trim();
    return this.prisma.customer.findMany({
      where: term ? { OR: [
        ...(uuidPattern.test(term) ? [{ id: term }] : []),
        { name: { contains: term, mode: 'insensitive' } },
        { contactName: { contains: term, mode: 'insensitive' } },
      ] } : undefined,
      select: { id: true, name: true, contactName: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  private validateStatus(status?: CustomerStatus) {
    if (status !== undefined && !Object.values(CustomerStatus).includes(status)) {
      throw new BadRequestException('A valid customer status is required.');
    }
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, _count: { select: { properties: true, workOrders: true } } },
    });
    if (!customer) throw new NotFoundException('Customer not found.');
    if (customer._count.workOrders > 0) {
      throw new ConflictException('This customer has operational history and cannot be permanently deleted.');
    }
    if (customer._count.properties > 0) {
      throw new ConflictException('This customer has linked properties and cannot be deleted.');
    }
    return this.prisma.customer.delete({ where: { id } });
  }
}
