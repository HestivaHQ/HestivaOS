import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CorrespondenceDeliveryAttemptStatus, CorrespondenceTemplateVersionStatus, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCorrespondenceTemplateInput = { key: string; name: string; subject?: string | null; body: string };
export type CreateCorrespondenceTemplateVersionInput = { subject?: string | null; body: string };
export type MaterializeCorrespondenceInput = {
  templateVersionId: string;
  recipientSnapshot: Record<string, unknown>;
  provenance?: Record<string, unknown>;
};
export type CreateCorrespondenceDeliveryAttemptInput = {
  routeSnapshot: Record<string, unknown>;
  previousAttemptId?: string | null;
};
export type RecordCorrespondenceDeliveryOutcomeInput = {
  status: CorrespondenceDeliveryAttemptStatus;
  providerReference?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  metadata?: Record<string, unknown>;
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

function actorSnapshot(actor: User): Prisma.InputJsonObject {
  return {
    userId: actor.id,
    authUserId: actor.authUserId,
    email: actor.email,
    displayName: actor.displayName ?? null,
  };
}

function optionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
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
      materializedBy: actorSnapshot(actor),
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

  async findDeliveryAttempts(correspondenceRecordId: string) {
    const record = await this.prisma.correspondenceRecord.findUnique({ where: { id: correspondenceRecordId }, select: { id: true } });
    if (!record) throw new NotFoundException('Correspondence record not found.');
    return this.prisma.correspondenceDeliveryAttempt.findMany({
      where: { correspondenceRecordId },
      orderBy: { attemptNumber: 'asc' },
      include: { events: { orderBy: { createdAt: 'asc' } } },
      take: 100,
    });
  }

  async createDeliveryAttempt(actor: User, correspondenceRecordId: string, input: CreateCorrespondenceDeliveryAttemptInput) {
    const routeSnapshot = jsonObject(input.routeSnapshot, 'routeSnapshot');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const record = await tx.correspondenceRecord.findUnique({ where: { id: correspondenceRecordId }, select: { id: true } });
        if (!record) throw new NotFoundException('Correspondence record not found.');

        let attemptNumber = 1;
        let previousAttemptId: string | null = null;
        if (input.previousAttemptId) {
          const latest = await tx.correspondenceDeliveryAttempt.findFirst({
            where: { correspondenceRecordId },
            orderBy: { attemptNumber: 'desc' },
            include: { events: { orderBy: { createdAt: 'desc' }, take: 1 } },
          });
          if (!latest || latest.id !== input.previousAttemptId) {
            throw new ConflictException('A retry must continue from the latest delivery attempt for this correspondence record.');
          }
          if (latest.events[0]?.status !== CorrespondenceDeliveryAttemptStatus.FAILED) {
            throw new ConflictException('Only a failed delivery attempt can be retried.');
          }
          attemptNumber = latest.attemptNumber + 1;
          previousAttemptId = latest.id;
        } else {
          const existing = await tx.correspondenceDeliveryAttempt.findFirst({ where: { correspondenceRecordId }, select: { id: true } });
          if (existing) throw new ConflictException('This correspondence record already has a delivery attempt. Retry from the latest failed attempt instead.');
        }

        return tx.correspondenceDeliveryAttempt.create({
          data: {
            correspondenceRecordId,
            attemptNumber,
            previousAttemptId,
            routeSnapshot,
            events: {
              create: {
                status: CorrespondenceDeliveryAttemptStatus.PENDING,
                metadata: { initiatedBy: actorSnapshot(actor) },
              },
            },
          },
          include: { events: { orderBy: { createdAt: 'asc' } } },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('The delivery-attempt chain changed concurrently. Reload the latest state before retrying.');
      }
      throw error;
    }
  }

  async recordDeliveryOutcome(actor: User, attemptId: string, input: RecordCorrespondenceDeliveryOutcomeInput) {
    if (input.status !== CorrespondenceDeliveryAttemptStatus.ACCEPTED && input.status !== CorrespondenceDeliveryAttemptStatus.FAILED) {
      throw new BadRequestException('status must be ACCEPTED or FAILED.');
    }
    const providerReference = optionalText(input.providerReference);
    const failureCode = optionalText(input.failureCode);
    const failureMessage = optionalText(input.failureMessage);
    if (input.status === CorrespondenceDeliveryAttemptStatus.FAILED && !failureCode && !failureMessage) {
      throw new BadRequestException('A failed delivery outcome requires failureCode or failureMessage.');
    }
    if (input.status === CorrespondenceDeliveryAttemptStatus.ACCEPTED && (failureCode || failureMessage)) {
      throw new BadRequestException('An accepted delivery outcome cannot include failure details.');
    }
    const callerMetadata = input.metadata === undefined ? {} : jsonObject(input.metadata, 'metadata');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const attempt = await tx.correspondenceDeliveryAttempt.findUnique({ where: { id: attemptId }, select: { id: true } });
        if (!attempt) throw new NotFoundException('Correspondence delivery attempt not found.');
        const terminal = await tx.correspondenceDeliveryAttemptEvent.findFirst({
          where: { attemptId, status: { in: [CorrespondenceDeliveryAttemptStatus.ACCEPTED, CorrespondenceDeliveryAttemptStatus.FAILED] } },
          select: { id: true },
        });
        if (terminal) throw new ConflictException('This delivery attempt already has a terminal outcome.');
        const pending = await tx.correspondenceDeliveryAttemptEvent.findFirst({
          where: { attemptId, status: CorrespondenceDeliveryAttemptStatus.PENDING },
          select: { id: true },
        });
        if (!pending) throw new ConflictException('This delivery attempt does not have a valid pending state.');

        return tx.correspondenceDeliveryAttemptEvent.create({
          data: {
            attemptId,
            status: input.status,
            providerReference,
            failureCode,
            failureMessage,
            metadata: { ...callerMetadata, recordedBy: actorSnapshot(actor) },
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This delivery attempt already has a terminal outcome.');
      }
      throw error;
    }
  }
}
