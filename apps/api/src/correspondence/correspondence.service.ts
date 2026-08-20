import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CorrespondenceTemplateVersionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCorrespondenceTemplateInput = { key: string; name: string; subject?: string | null; body: string };
export type CreateCorrespondenceTemplateVersionInput = { subject?: string | null; body: string };

function required(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException(`${field} is required.`);
  return normalized;
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
    const key = required(input.key, 'key');
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
}
