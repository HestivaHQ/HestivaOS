import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BathroomCount, BedroomCount, BusinessListType, LivingAreaCount, Prisma, StoreyCount } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreatePropertyInput = {
  customerId: string; name: string; addressLine1: string; addressLine2?: string; city: string; province?: string;
  postalCode?: string; country?: string; accessNotes?: string; propertyTypeOptionId?: string | null;
  bedrooms?: BedroomCount | null; bathrooms?: BathroomCount | null; livingAreas?: LivingAreaCount | null; storeys?: StoreyCount | null;
  isEstateOrComplex?: boolean | null; requiresGateSecurityAccess?: boolean | null; parkingNotes?: string;
  hasPets?: boolean | null; petNotes?: string; hasCameras?: boolean | null; offLimitsNotes?: string;
  fragileItemNotes?: string; productRestrictionNotes?: string; allergyNotes?: string;
};
export type UpdatePropertyInput = Partial<CreatePropertyInput>;

const allowedFields = new Set<keyof CreatePropertyInput>([
  'customerId', 'name', 'addressLine1', 'addressLine2', 'city', 'province', 'postalCode', 'country', 'accessNotes', 'propertyTypeOptionId',
  'bedrooms', 'bathrooms', 'livingAreas', 'storeys', 'isEstateOrComplex', 'requiresGateSecurityAccess', 'parkingNotes', 'hasPets', 'petNotes',
  'hasCameras', 'offLimitsNotes', 'fragileItemNotes', 'productRestrictionNotes', 'allergyNotes',
]);
const textFields = ['addressLine2', 'province', 'postalCode', 'accessNotes', 'parkingNotes', 'petNotes', 'offLimitsNotes', 'fragileItemNotes', 'productRestrictionNotes', 'allergyNotes'] as const;

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePropertyInput) {
    this.validateInput(input);
    if (!input.customerId || !input.name?.trim() || !input.addressLine1?.trim() || !input.city?.trim()) throw new BadRequestException('customerId, name, addressLine1 and city are required.');
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found.');
    await this.validatePropertyType(input.propertyTypeOptionId);
    return this.prisma.property.create({
      data: {
        customerId: input.customerId, name: input.name.trim(), addressLine1: input.addressLine1.trim(), addressLine2: input.addressLine2?.trim() || null,
        city: input.city.trim(), province: input.province?.trim() || null, postalCode: input.postalCode?.trim() || null, country: input.country?.trim() || undefined,
        accessNotes: input.accessNotes?.trim() || null, propertyTypeOptionId: input.propertyTypeOptionId || null,
        bedrooms: input.bedrooms ?? null, bathrooms: input.bathrooms ?? null, livingAreas: input.livingAreas ?? null, storeys: input.storeys ?? null,
        isEstateOrComplex: input.isEstateOrComplex ?? null, requiresGateSecurityAccess: input.requiresGateSecurityAccess ?? null, parkingNotes: input.parkingNotes?.trim() || null,
        hasPets: input.hasPets ?? null, petNotes: input.petNotes?.trim() || null, hasCameras: input.hasCameras ?? null, offLimitsNotes: input.offLimitsNotes?.trim() || null,
        fragileItemNotes: input.fragileItemNotes?.trim() || null, productRestrictionNotes: input.productRestrictionNotes?.trim() || null, allergyNotes: input.allergyNotes?.trim() || null,
      }, include: { customer: true, propertyTypeOption: true, _count: { select: { workOrders: true } } },
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, customerId?: string) {
    const safePage = Math.max(1, page), safePageSize = Math.min(100, Math.max(1, pageSize)), term = search?.trim();
    const where: Prisma.PropertyWhereInput = { customerId, ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { addressLine1: { contains: term, mode: 'insensitive' } }, { city: { contains: term, mode: 'insensitive' } }] } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safePageSize, take: safePageSize,
        include: { customer: true, propertyTypeOption: true, _count: { select: { workOrders: true } } },
      }),
      this.prisma.property.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  selectorOptions(customerId?: string) {
    return this.prisma.property.findMany({ where: { customerId }, select: { id: true, customerId: true, name: true, addressLine1: true, city: true }, orderBy: { name: 'asc' }, take: 100 });
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id }, include: { customer: true, propertyTypeOption: true, workOrders: { orderBy: { createdAt: 'desc' } } } });
    if (!property) throw new NotFoundException('Property not found.');
    return property;
  }

  async update(id: string, input: UpdatePropertyInput) {
    this.validateInput(input);
    const existing = await this.findOne(id);
    if (input.customerId !== undefined) { const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }); if (!customer) throw new NotFoundException('Customer not found.'); }
    if (input.propertyTypeOptionId !== undefined && input.propertyTypeOptionId !== existing.propertyTypeOptionId) await this.validatePropertyType(input.propertyTypeOptionId);
    const data: Record<string, unknown> = {};
    for (const field of textFields) if (input[field] !== undefined) data[field] = input[field]?.trim() || null;
    for (const field of ['bedrooms', 'bathrooms', 'livingAreas', 'storeys', 'isEstateOrComplex', 'requiresGateSecurityAccess', 'hasPets', 'hasCameras'] as const) if (input[field] !== undefined) data[field] = input[field] ?? null;
    if (input.customerId !== undefined) data.customerId = input.customerId;
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1.trim();
    if (input.city !== undefined) data.city = input.city.trim();
    if (input.country !== undefined) data.country = input.country.trim();
    if (input.propertyTypeOptionId !== undefined) data.propertyTypeOptionId = input.propertyTypeOptionId || null;
    return this.prisma.property.update({ where: { id }, data, include: { customer: true, propertyTypeOption: true, _count: { select: { workOrders: true } } } });
  }

  private validateInput(input: UpdatePropertyInput) {
    const unsupported = Object.keys(input).filter((key) => !allowedFields.has(key as keyof CreatePropertyInput));
    if (unsupported.length) throw new BadRequestException(`Unsupported property field: ${unsupported.join(', ')}.`);
    this.validateEnum('bedrooms', input.bedrooms, BedroomCount); this.validateEnum('bathrooms', input.bathrooms, BathroomCount);
    this.validateEnum('livingAreas', input.livingAreas, LivingAreaCount); this.validateEnum('storeys', input.storeys, StoreyCount);
    for (const field of ['isEstateOrComplex', 'requiresGateSecurityAccess', 'hasPets', 'hasCameras'] as const) if (input[field] !== undefined && input[field] !== null && typeof input[field] !== 'boolean') throw new BadRequestException(`${field} must be a boolean or null.`);
  }
  private validateEnum(name: string, value: string | null | undefined, values: object) { if (value !== undefined && value !== null && !Object.values(values).includes(value)) throw new BadRequestException(`A valid ${name} value is required.`); }
  private async validatePropertyType(id?: string | null) { if (!id) return; const option = await this.prisma.businessListOption.findUnique({ where: { id }, select: { type: true, isActive: true } }); if (!option) throw new NotFoundException('Property type not found.'); if (option.type !== BusinessListType.PROPERTY_TYPE) throw new BadRequestException('The selected option is not a property type.'); if (!option.isActive) throw new BadRequestException('The selected property type is inactive.'); }
  async remove(id: string) { await this.findOne(id); return this.prisma.property.delete({ where: { id } }); }
}
