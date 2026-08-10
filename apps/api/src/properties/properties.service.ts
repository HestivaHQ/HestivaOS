import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessListType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreatePropertyInput = {
  customerId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country?: string;
  accessNotes?: string;
  propertyTypeOptionId?: string | null;
};

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePropertyInput) {
    if (!input.customerId || !input.name?.trim() || !input.addressLine1?.trim() || !input.city?.trim()) {
      throw new BadRequestException('customerId, name, addressLine1 and city are required.');
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found.');
    await this.validatePropertyType(input.propertyTypeOptionId);

    return this.prisma.property.create({
      data: {
        customerId: input.customerId,
        name: input.name.trim(),
        addressLine1: input.addressLine1.trim(),
        addressLine2: input.addressLine2?.trim() || null,
        city: input.city.trim(),
        province: input.province?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        country: input.country?.trim() || undefined,
        accessNotes: input.accessNotes?.trim() || null,
        propertyTypeOptionId: input.propertyTypeOptionId || null,
      },
      include: { customer: true, propertyTypeOption: true, _count: { select: { workOrders: true } } },
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, customerId?: string) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.PropertyWhereInput = {
      customerId,
      ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { addressLine1: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ] } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: { customer: true, propertyTypeOption: true, _count: { select: { workOrders: true } } },
      }),
      this.prisma.property.count({ where }),
    ]);

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { customer: true, propertyTypeOption: true, workOrders: { orderBy: { createdAt: 'desc' } } },
    });
    if (!property) throw new NotFoundException('Property not found.');
    return property;
  }

  async update(id: string, input: UpdatePropertyInput) {
    const existing = await this.findOne(id);
    if (input.customerId !== undefined) {
      const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
      if (!customer) throw new NotFoundException('Customer not found.');
    }
    if (input.propertyTypeOptionId !== undefined && input.propertyTypeOptionId !== existing.propertyTypeOptionId) {
      await this.validatePropertyType(input.propertyTypeOptionId);
    }
    return this.prisma.property.update({
      where: { id },
      data: {
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1.trim() } : {}),
        ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2.trim() || null } : {}),
        ...(input.city !== undefined ? { city: input.city.trim() } : {}),
        ...(input.province !== undefined ? { province: input.province.trim() || null } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode.trim() || null } : {}),
        ...(input.country !== undefined ? { country: input.country.trim() } : {}),
        ...(input.accessNotes !== undefined ? { accessNotes: input.accessNotes.trim() || null } : {}),
        ...(input.propertyTypeOptionId !== undefined ? { propertyTypeOptionId: input.propertyTypeOptionId || null } : {}),
      },
      include: { customer: true, propertyTypeOption: true, _count: { select: { workOrders: true } } },
    });
  }

  private async validatePropertyType(id?: string | null) {
    if (!id) return;
    const option = await this.prisma.businessListOption.findUnique({ where: { id }, select: { type: true, isActive: true } });
    if (!option) throw new NotFoundException('Property type not found.');
    if (option.type !== BusinessListType.PROPERTY_TYPE) throw new BadRequestException('The selected option is not a property type.');
    if (!option.isActive) throw new BadRequestException('The selected property type is inactive.');
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.property.delete({ where: { id } });
  }
}
