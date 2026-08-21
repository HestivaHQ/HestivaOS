import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomerAccountType,
  CustomerContactStatus,
  CustomerStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCustomerInput = {
  ownerId: string;
  accountType?: CustomerAccountType;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: CustomerStatus;
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'ownerId'>>;

export type CreateCustomerContactInput = {
  name: string;
  relationship?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
};

export type UpdateCustomerContactInput = Partial<CreateCustomerContactInput> & {
  status?: CustomerContactStatus;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerInput) {
    if (!input.ownerId) throw new BadRequestException('ownerId is required.');
    this.validateStatus(input.status);
    this.validateAccountType(input.accountType);

    const accountType = input.accountType ?? CustomerAccountType.INDIVIDUAL;
    const contactName = input.contactName?.trim() || '';
    const suppliedName = input.name?.trim() || '';

    if (accountType === CustomerAccountType.INDIVIDUAL && !contactName) {
      throw new BadRequestException('contactName is required for an individual Customer.');
    }
    if (accountType === CustomerAccountType.ORGANISATION && !suppliedName) {
      throw new BadRequestException('name is required for an organisation Customer.');
    }

    const canonicalName = accountType === CustomerAccountType.ORGANISATION
      ? suppliedName
      : contactName;
    const email = input.email?.trim().toLowerCase() || null;
    const phone = input.phone?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ownerId: input.ownerId,
          name: canonicalName,
          accountType,
          // Legacy compatibility fields remain populated while callers migrate
          // to CustomerContact as the canonical human-contact layer.
          contactName: contactName || null,
          email,
          phone,
          notes: input.notes?.trim() || null,
          status: input.status,
        },
      });

      if (contactName) {
        await tx.customerContact.create({
          data: {
            customerId: customer.id,
            name: contactName,
            relationship: accountType === CustomerAccountType.INDIVIDUAL ? 'SELF' : 'PRIMARY_CONTACT',
            email,
            phone,
            isPrimary: true,
          },
        });
      }

      return customer;
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
              {
                contacts: {
                  some: {
                    status: CustomerContactStatus.ACTIVE,
                    OR: [
                      { name: { contains: term, mode: 'insensitive' } },
                      { email: { contains: term, mode: 'insensitive' } },
                      { phone: { contains: term, mode: 'insensitive' } },
                    ],
                  },
                },
              },
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
        include: { _count: { select: { properties: true, workOrders: true, contacts: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        properties: true,
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          include: {
            messagingIdentities: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                channel: true,
                provider: true,
                phoneNumber: true,
                displayName: true,
                trustState: true,
                trustedAt: true,
                retiredAt: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        _count: { select: { workOrders: true } },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found.');
    return customer;
  }

  async update(id: string, input: UpdateCustomerInput) {
    const current = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, accountType: true, name: true },
    });
    if (!current) throw new NotFoundException('Customer not found.');

    this.validateStatus(input.status);
    this.validateAccountType(input.accountType);
    if (input.contactName !== undefined && !input.contactName.trim()) {
      throw new BadRequestException('contactName cannot be blank. Manage contacts through the Customer contact endpoints when removing a contact.');
    }

    const nextAccountType = input.accountType ?? current.accountType ?? CustomerAccountType.INDIVIDUAL;
    if (nextAccountType === CustomerAccountType.ORGANISATION && input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException('name is required for an organisation Customer.');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.contactName !== undefined ? { contactName: input.contactName.trim() } : {}),
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
        {
          contacts: {
            some: {
              status: CustomerContactStatus.ACTIVE,
              name: { contains: term, mode: 'insensitive' },
            },
          },
        },
      ] } : undefined,
      select: { id: true, name: true, accountType: true, contactName: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async findContacts(customerId: string) {
    await this.requireCustomer(customerId);
    return this.prisma.customerContact.findMany({
      where: { customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      include: {
        messagingIdentities: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            channel: true,
            provider: true,
            phoneNumber: true,
            displayName: true,
            trustState: true,
            trustedAt: true,
            retiredAt: true,
          },
        },
      },
    });
  }

  async createContact(customerId: string, input: CreateCustomerContactInput) {
    await this.requireCustomer(customerId);
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Contact name is required.');

    return this.prisma.$transaction(async (tx) => {
      const activeCount = await tx.customerContact.count({
        where: { customerId, status: CustomerContactStatus.ACTIVE },
      });
      const isPrimary = input.isPrimary === true || activeCount === 0;
      if (isPrimary) {
        await tx.customerContact.updateMany({
          where: { customerId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.customerContact.create({
        data: {
          customerId,
          name,
          relationship: input.relationship?.trim() || null,
          email: input.email?.trim().toLowerCase() || null,
          phone: input.phone?.trim() || null,
          isPrimary,
          status: CustomerContactStatus.ACTIVE,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateContact(customerId: string, contactId: string, input: UpdateCustomerContactInput) {
    this.validateContactStatus(input.status);
    const existing = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId },
    });
    if (!existing) throw new NotFoundException('Customer contact not found.');
    if (input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException('Contact name cannot be blank.');
    }
    if (input.isPrimary === false && existing.isPrimary && input.status !== CustomerContactStatus.RETIRED) {
      throw new BadRequestException('Make another active contact primary instead of clearing the current primary contact.');
    }

    return this.prisma.$transaction(async (tx) => {
      const retiring = input.status === CustomerContactStatus.RETIRED;
      const makingPrimary = input.isPrimary === true && !retiring;

      if (makingPrimary) {
        await tx.customerContact.updateMany({
          where: { customerId, isPrimary: true, id: { not: contactId } },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.customerContact.update({
        where: { id: contactId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.relationship !== undefined ? { relationship: input.relationship.trim() || null } : {}),
          ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() || null } : {}),
          ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(makingPrimary ? { isPrimary: true } : {}),
          ...(retiring ? { isPrimary: false } : {}),
        },
      });

      if (retiring && existing.isPrimary) {
        const replacement = await tx.customerContact.findFirst({
          where: {
            customerId,
            id: { not: contactId },
            status: CustomerContactStatus.ACTIVE,
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (replacement) {
          await tx.customerContact.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
        }
      }

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private validateStatus(status?: CustomerStatus) {
    if (status !== undefined && !Object.values(CustomerStatus).includes(status)) {
      throw new BadRequestException('A valid customer status is required.');
    }
  }

  private validateAccountType(accountType?: CustomerAccountType) {
    if (accountType !== undefined && !Object.values(CustomerAccountType).includes(accountType)) {
      throw new BadRequestException('A valid customer account type is required.');
    }
  }

  private validateContactStatus(status?: CustomerContactStatus) {
    if (status !== undefined && !Object.values(CustomerContactStatus).includes(status)) {
      throw new BadRequestException('A valid customer contact status is required.');
    }
  }

  private async requireCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found.');
    return customer;
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            properties: true,
            workOrders: true,
            messagingConversations: true,
            contacts: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found.');
    if (customer._count.workOrders > 0) {
      throw new ConflictException('This customer has operational history and cannot be permanently deleted.');
    }
    if (customer._count.properties > 0) {
      throw new ConflictException('This customer has linked properties and cannot be deleted.');
    }
    if (customer._count.messagingConversations > 0) {
      throw new ConflictException('This customer has messaging history and cannot be permanently deleted.');
    }
    if (customer._count.contacts > 0) {
      throw new ConflictException('This customer has contact history and cannot be permanently deleted.');
    }
    return this.prisma.customer.delete({ where: { id } });
  }
}
