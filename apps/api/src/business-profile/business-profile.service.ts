import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const textFields = ['registeredName', 'tradingName', 'registrationNumber', 'contactNumber', 'businessEmail', 'website', 'businessAddress', 'bankName', 'accountHolder', 'accountNumber', 'accountType', 'branchCode', 'paymentInstructions', 'taxNumber', 'vatNumber', 'officialIdentifiers'] as const;
const shareFields = textFields.map((field) => `share${field[0].toUpperCase()}${field.slice(1)}`) as Array<`share${Capitalize<(typeof textFields)[number]>}`>;
export type BusinessProfileInput = Partial<Record<(typeof textFields)[number], string | null> & Record<(typeof shareFields)[number], boolean>>;
const profileSelect = Object.fromEntries([...textFields, ...shareFields].map((field) => [field, true])) as Prisma.BusinessProfileSelect;

@Injectable()
export class BusinessProfileService {
  private readonly logger = new Logger(BusinessProfileService.name);
  constructor(private readonly prisma: PrismaService) {}
  find() { return this.prisma.businessProfile.upsert({ where: { id: 'hestiva' }, create: { id: 'hestiva' }, update: {}, select: profileSelect }); }
  async update(actorId: string, input: BusinessProfileInput) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('A valid business profile update is required.');
    const allowed = new Set<string>([...textFields, ...shareFields]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new BadRequestException(`Unsupported business profile fields: ${unknown.join(', ')}.`);
    const data: Record<string, string | boolean | null> = {};
    for (const field of textFields) {
      if (!(field in input)) continue;
      const value = input[field];
      if (value !== null && typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
      data[field] = value?.trim() || null;
    }
    for (const field of shareFields) {
      if (!(field in input)) continue;
      if (typeof input[field] !== 'boolean') throw new BadRequestException(`${field} must be on or off.`);
      data[field] = input[field] as boolean;
    }
    const email = data.businessEmail;
    if (typeof email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid business email address.');
    const website = data.website;
    if (typeof website === 'string') {
      try { const parsed = new URL(website); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); }
      catch { throw new BadRequestException('Website must be a valid http or https URL.'); }
    }
    const changedFields = Object.keys(data);
    const result = await this.prisma.businessProfile.upsert({ where: { id: 'hestiva' }, create: { id: 'hestiva', ...data }, update: data, select: profileSelect });
    if (changedFields.length) this.logger.log(`business_profile_changed actorUserId=${actorId} fields=${changedFields.join(',')}`);
    return result;
  }
}
