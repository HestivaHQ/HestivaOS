import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceScopeTemplateVersionStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type SectionInput = { stableKey: string; title: string; requirements?: string[]; evidencePolicy?: 'NONE'|'ON_EXCEPTION'|'REQUIRED'; repeatByPropertyField?: 'bedrooms'|'bathrooms'|'livingAreas'; sortOrder?: number };
const PRE_START: WorkOrderStatus[] = [WorkOrderStatus.NEW, WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED, WorkOrderStatus.TRAVELLING];
const counts: Record<string, number> = { STUDIO: 1, ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE_PLUS: 5, FOUR_PLUS: 4 };
type ComparableSection={stableKey:string;title:string;requirements:string[];evidencePolicy:string};
export function compareScopeSections(current:ComparableSection[],target:ComparableSection[]){const before=new Map(current.map(x=>[x.stableKey,x]));const after=new Map(target.map(x=>[x.stableKey,x]));return {added:target.filter(x=>!before.has(x.stableKey)),removed:current.filter(x=>!after.has(x.stableKey)),changed:target.flatMap(x=>{const prior=before.get(x.stableKey);return prior&&(prior.title!==x.title||prior.evidencePolicy!==x.evidencePolicy||JSON.stringify(prior.requirements)!==JSON.stringify(x.requirements))?[{stableKey:x.stableKey,before:prior,after:x}]:[]})}}

@Injectable()
export class ExecutionScopesService {
  constructor(private readonly prisma: PrismaService) {}
  async listTemplates(serviceId?: string, search?: string) {
    return this.prisma.serviceScopeTemplate.findMany({ where: { ...(serviceId ? { serviceId } : {}), ...(search?.trim() ? { name: { contains: search.trim(), mode: 'insensitive' } } : {}) }, include: { service: { select: { id: true, name: true, status: true } }, versions: { include: { sections: { orderBy: { sortOrder: 'asc' } }, _count: { select: { scopeRevisions: true } } }, orderBy: { version: 'desc' } } }, orderBy: [{ service: { name: 'asc' } }, { name: 'asc' }], take: 100 });
  }
  async getTemplate(id: string) {
    const template = await this.prisma.serviceScopeTemplate.findUnique({ where: { id }, include: { service: { select: { id: true, name: true, status: true } }, versions: { include: { sections: { orderBy: { sortOrder: 'asc' } }, _count: { select: { scopeRevisions: true } } }, orderBy: { version: 'desc' } } } });
    if (!template) throw new NotFoundException('Service scope template was not found.'); return template;
  }
  async createTemplate(serviceId: string, input: { name: string; sections: SectionInput[] }) {
    if (!input.name?.trim() || !input.sections?.length) throw new BadRequestException('A template name and at least one section are required.');
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { status: true } });
    if (!service || service.status !== 'ACTIVE') throw new BadRequestException('An active canonical Service is required.');
    return this.prisma.serviceScopeTemplate.create({ data: { serviceId, name: input.name.trim(), versions: { create: { version: 1, sections: { create: this.cleanSections(input.sections) } } } }, include: { versions: { include: { sections: true } } } });
  }
  async createVersion(templateId: string, sections: SectionInput[]) {
    if (!sections?.length) throw new BadRequestException('At least one section is required.');
    return this.prisma.$transaction(async (tx) => { const latest = await tx.serviceScopeTemplateVersion.findFirst({ where: { templateId }, orderBy: { version: 'desc' }, select: { version: true } }); if (!latest) throw new NotFoundException('Service scope template was not found.'); return tx.serviceScopeTemplateVersion.create({ data: { templateId, version: latest.version + 1, sections: { create: this.cleanSections(sections) } }, include: { sections: true } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async publish(versionId: string) { const version = await this.prisma.serviceScopeTemplateVersion.findUnique({ where: { id: versionId }, select: { status: true } }); if (!version) throw new NotFoundException('Template version was not found.'); if (version.status !== ServiceScopeTemplateVersionStatus.DRAFT) throw new ConflictException('Only a draft template version can be published.'); return this.prisma.serviceScopeTemplateVersion.update({ where: { id: versionId }, data: { status: 'PUBLISHED', publishedAt: new Date() } }); }
  async retire(versionId: string) { const version = await this.prisma.serviceScopeTemplateVersion.findUnique({ where: { id: versionId }, select: { status: true } }); if (!version || version.status !== 'PUBLISHED') throw new ConflictException('Only a published template version can be retired.'); return this.prisma.serviceScopeTemplateVersion.update({ where: { id: versionId }, data: { status: 'RETIRED', retiredAt: new Date() } }); }
  async compareWorkOrder(workOrderId: string, templateVersionId: string) {
    const job = await this.prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id:true,status:true,startedAt:true,serviceId:true,sourceQuote:{select:{id:true}},executionScopeRevisions:{orderBy:{revision:'desc'},take:1,include:{templateVersion:{select:{id:true,version:true,templateId:true}},sections:{orderBy:{sortOrder:'asc'},select:{stableKey:true,title:true,requirements:true,evidencePolicy:true}}}} } });
    if (!job) throw new NotFoundException('Work Order was not found.');
    const target = await this.prisma.serviceScopeTemplateVersion.findUnique({ where:{id:templateVersionId}, include:{template:{select:{id:true,serviceId:true,name:true}},sections:{orderBy:{sortOrder:'asc'},select:{stableKey:true,title:true,requirements:true,evidencePolicy:true}}} });
    if (!target || target.status !== 'PUBLISHED' || target.template.serviceId !== job.serviceId) throw new BadRequestException('Select a published scope version for this Work Order service.');
    const current=job.executionScopeRevisions[0]; const {added,removed,changed}=compareScopeSections(current?.sections??[],target.sections);
    return { workOrderId, currentRevision: current ? { id:current.id,revision:current.revision,templateVersionId:current.templateVersion.id,templateVersion:current.templateVersion.version } : null, target:{id:target.id,version:target.version,templateId:target.template.id,templateName:target.template.name}, added,removed,changed, canAdopt:!job.startedAt&&PRE_START.includes(job.status), blockedReason:job.startedAt||!PRE_START.includes(job.status)?'Started or historical Work Orders retain their frozen Execution Scope.':null, quoteDerived:Boolean(job.sourceQuote) };
  }
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
  private cleanSections(sections: SectionInput[]) { const cleaned=sections.map((section, index) => ({ stableKey: section.stableKey?.trim(), title: section.title?.trim(), requirements: (section.requirements ?? []).map(x => x.trim()).filter(Boolean), evidencePolicy: section.evidencePolicy ?? 'NONE' as const, repeatByPropertyField: section.repeatByPropertyField ?? null, sortOrder: section.sortOrder ?? index })); if(cleaned.some(x=>!x.stableKey||!x.title)||new Set(cleaned.map(x=>x.stableKey)).size!==cleaned.length) throw new BadRequestException('Every section requires a unique stable key and title.'); return cleaned; }
  private instantiate(section: any, property: any) { const quantity = section.repeatByPropertyField ? (counts[property[section.repeatByPropertyField] ?? ''] ?? 1) : 1; return Array.from({ length: quantity }, (_, index) => ({ templateSectionId: section.id, stableKey: quantity > 1 ? `${section.stableKey}-${index + 1}` : section.stableKey, title: quantity > 1 ? `${section.title} ${index + 1}` : section.title, requirements: section.requirements, evidencePolicy: section.evidencePolicy, quantity: section.repeatByPropertyField ? 1 : null, sortOrder: section.sortOrder * 100 + index })); }
}
