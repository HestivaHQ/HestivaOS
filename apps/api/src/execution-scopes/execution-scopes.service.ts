import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceScopeTemplateVersionStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type SectionInput = { stableKey: string; title: string; requirements?: string[]; evidencePolicy?: 'NONE'|'ON_EXCEPTION'|'REQUIRED'; repeatByPropertyField?: 'bedrooms'|'bathrooms'|'livingAreas'; sortOrder?: number };
const PRE_START: WorkOrderStatus[] = [WorkOrderStatus.NEW, WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED, WorkOrderStatus.TRAVELLING];
const counts: Record<string, number> = { STUDIO: 1, ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE_PLUS: 5, FOUR_PLUS: 4 };

@Injectable()
export class ExecutionScopesService {
  constructor(private readonly prisma: PrismaService) {}
  createTemplate(serviceId: string, input: { name: string; sections: SectionInput[] }) {
    if (!input.name?.trim() || !input.sections?.length) throw new BadRequestException('A template name and at least one section are required.');
    return this.prisma.serviceScopeTemplate.create({ data: { serviceId, name: input.name.trim(), versions: { create: { version: 1, sections: { create: this.cleanSections(input.sections) } } } }, include: { versions: { include: { sections: true } } } });
  }
  async createVersion(templateId: string, sections: SectionInput[]) {
    if (!sections?.length) throw new BadRequestException('At least one section is required.');
    return this.prisma.$transaction(async (tx) => { const latest = await tx.serviceScopeTemplateVersion.findFirst({ where: { templateId }, orderBy: { version: 'desc' }, select: { version: true } }); if (!latest) throw new NotFoundException('Service scope template was not found.'); return tx.serviceScopeTemplateVersion.create({ data: { templateId, version: latest.version + 1, sections: { create: this.cleanSections(sections) } }, include: { sections: true } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async publish(versionId: string) { const version = await this.prisma.serviceScopeTemplateVersion.findUnique({ where: { id: versionId }, select: { status: true } }); if (!version) throw new NotFoundException('Template version was not found.'); if (version.status !== ServiceScopeTemplateVersionStatus.DRAFT) throw new ConflictException('Only a draft template version can be published.'); return this.prisma.serviceScopeTemplateVersion.update({ where: { id: versionId }, data: { status: 'PUBLISHED', publishedAt: new Date() } }); }
  async retire(versionId: string) { const version = await this.prisma.serviceScopeTemplateVersion.findUnique({ where: { id: versionId }, select: { status: true } }); if (!version || version.status !== 'PUBLISHED') throw new ConflictException('Only a published template version can be retired.'); return this.prisma.serviceScopeTemplateVersion.update({ where: { id: versionId }, data: { status: 'RETIRED', retiredAt: new Date() } }); }
  async reviseWorkOrder(workOrderId: string, actorId: string, input: { templateVersionId: string; additions?: string[]; exclusions?: string[] }) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true, status: true, startedAt: true, property: { select: { bedrooms: true, bathrooms: true, livingAreas: true } }, executionScopeRevisions: { orderBy: { revision: 'desc' }, take: 1, select: { revision: true } } } });
      if (!job) throw new NotFoundException('Work Order was not found.'); if (job.startedAt || !PRE_START.includes(job.status)) throw new ConflictException('Execution Scope can only be revised before Start Job.');
      const version = await tx.serviceScopeTemplateVersion.findUnique({ where: { id: input.templateVersionId }, include: { sections: { orderBy: { sortOrder: 'asc' } } } });
      if (!version || version.status !== 'PUBLISHED') throw new ConflictException('New Execution Scope revisions require a Published template version.');
      const revisionNumber = (job.executionScopeRevisions[0]?.revision ?? 0) + 1; const sections = version.sections.flatMap((section) => this.instantiate(section, job.property));
      const revision = await tx.workOrderExecutionScopeRevision.create({ data: { workOrderId, templateVersionId: version.id, revision: revisionNumber, createdById: actorId, additions: input.additions ?? [], exclusions: input.exclusions ?? [], sections: { create: sections } }, include: { sections: true } });
      await tx.workOrderActivity.create({ data: { workOrderId, type: 'EXECUTION_SCOPE_REVISED', actorId, note: `Execution Scope revision ${revisionNumber} created from published template version ${version.version}.` } }); return revision;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  private cleanSections(sections: SectionInput[]) { return sections.map((section, index) => ({ stableKey: section.stableKey.trim(), title: section.title.trim(), requirements: (section.requirements ?? []).map(x => x.trim()).filter(Boolean), evidencePolicy: section.evidencePolicy ?? 'NONE' as const, repeatByPropertyField: section.repeatByPropertyField ?? null, sortOrder: section.sortOrder ?? index })); }
  private instantiate(section: any, property: any) { const quantity = section.repeatByPropertyField ? (counts[property[section.repeatByPropertyField] ?? ''] ?? 1) : 1; return Array.from({ length: quantity }, (_, index) => ({ templateSectionId: section.id, stableKey: quantity > 1 ? `${section.stableKey}-${index + 1}` : section.stableKey, title: quantity > 1 ? `${section.title} ${index + 1}` : section.title, requirements: section.requirements, evidencePolicy: section.evidencePolicy, quantity: section.repeatByPropertyField ? 1 : null, sortOrder: section.sortOrder * 100 + index })); }
}
