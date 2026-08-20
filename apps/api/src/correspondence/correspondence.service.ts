import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CorrespondenceTemplateVersionStatus, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCorrespondenceTemplateInput = { key: string; name: string; subject?: string | null; body: string };
export type CreateCorrespondenceTemplateVersionInput = { subject?: string | null; body: string };
export type MaterializeCorrespondenceInput = {
  templateVersionId: string;
  recipientSnapshot: Record<string, unknown>;
  provenance?: Record<string, unknown>;
};

function required(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException(`${field} is required.`);
  return normalized;
}

function normalizeTemplateKey(value: string | undefined): string {
  const key = required(value, 'key')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!key) throw new BadRequestException('key is required.');
  return key;
}

function jsonObject(value: unknown, field: string): Prisma.InputJsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be a JSON object.`);
  }
  return value as Prisma.InputJsonObject;
}

@Injectable()
export class CorrespondenceService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.correspondenceTemplate.findMany({
      orderBy: { name: 'asc' },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.correspondenceTemplate.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!template) throw new NotFoundException('Correspondence template not found.');
    return template;
  }

  async create(input: CreateCorrespondenceTemplateInput) {
    const key = normalizeTemplateKey(input.key);
    const name = required(input.name, 'name');
    const body = required(input.body, 'body');
    try {
      return await this.prisma.correspondenceTemplate.create({
        data: {
          key,
          name,
          versions: { create: { version: 1, subject: input.subject?.trim() || null, body } },
        },
        include: { versions: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Correspondence template key already exists.');
      }
      throw error;
    }
  }

  async createVersion(templateId: string, input: CreateCorrespondenceTemplateVersionInput) {
    const body = required(input.body, 'body');
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.correspondenceTemplate.findUnique({ where: { id: templateId } });
      if (!template) throw new NotFoundException('Correspondence template not found.');
      const draft = await tx.correspondenceTemplateVersion.findFirst({ where: { templateId, status: CorrespondenceTemplateVersionStatus.DRAFT } });
      if (draft) throw new ConflictException('This template already has a draft version.');
      const latest = await tx.correspondenceTemplateVersion.aggregate({ where: { templateId }, _max: { version: true } });
      return tx.correspondenceTemplateVersion.create({
        data: { templateId, version: (latest._max.version ?? 0) + 1, subject: input.subject?.trim() || null, body },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async publish(templateId: string, versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.correspondenceTemplateVersion.findFirst({ where: { id: versionId, templateId } });
      if (!target) throw new NotFoundException('Correspondence template version not found.');
      if (target.status !== CorrespondenceTemplateVersionStatus.DRAFT) throw new ConflictException('Only a draft version can be published.');
      const now = new Date();
      await tx.correspondenceTemplateVersion.updateMany({
        where: { templateId, status: CorrespondenceTemplateVersionStatus.PUBLISHED },
        data: { status: CorrespondenceTemplateVersionStatus.RETIRED, retiredAt: now },
      });
      return tx.correspondenceTemplateVersion.update({
        where: { id: target.id },
        data: { status: CorrespondenceTemplateVersionStatus.PUBLISHED, publishedAt: now, retiredAt: null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async retire(templateId: string, versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.correspondenceTemplateVersion.findFirst({ where: { id: versionId, templateId } });
      if (!target) throw new NotFoundException('Correspondence template version not found.');
      if (target.status !== CorrespondenceTemplateVersionStatus.PUBLISHED) throw new ConflictException('Only a published version can be retired.');
      return tx.correspondenceTemplateVersion.update({
        where: { id: target.id },
        data: { status: CorrespondenceTemplateVersionStatus.RETIRED, retiredAt: new Date() },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  findRecords() {
    return this.prisma.correspondenceRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: { templateVersion: { include: { template: true } } },
      take: 100,
    });
  }

  async findRecord(id: string) {
    const record = await this.prisma.correspondenceRecord.findUnique({
      where: { id },
      include: { templateVersion: { include: { template: true } } },
    });
    if (!record) throw new NotFoundException('Correspondence record not found.');
    return record;
  }

  async materialize(actor: User, input: MaterializeCorrespondenceInput) {
    const recipientSnapshot = jsonObject(input.recipientSnapshot, 'recipientSnapshot');
    const callerProvenance = input.provenance === undefined ? {} : jsonObject(input.provenance, 'provenance');
    const version = await this.prisma.correspondenceTemplateVersion.findUnique({
      where: { id: input.templateVersionId },
      include: { template: true },
    });
    if (!version) throw new NotFoundException('Correspondence template version not found.');
    if (version.status !== CorrespondenceTemplateVersionStatus.PUBLISHED) {
      throw new ConflictException('Only a published correspondence template version can be materialized.');
    }

    const provenance: Prisma.InputJsonObject = {
      ...callerProvenance,
      materializedBy: {
        userId: actor.id,
        authUserId: actor.authUserId,
        email: actor.email,
        displayName: actor.displayName ?? null,
      },
    };

    return this.prisma.correspondenceRecord.create({
      data: {
        templateVersionId: version.id,
        templateKeySnapshot: version.template.key,
        templateVersionNumber: version.version,
        subject: version.subject,
        body: version.body,
        recipientSnapshot,
        provenance,
      },
      include: { templateVersion: { include: { template: true } } },
    });
  }
}
