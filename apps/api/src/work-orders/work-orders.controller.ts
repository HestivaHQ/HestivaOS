import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { User, UserRole, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { MaterialChangeCommitInput, MaterialChangePreviewInput, WorkOrderMaterialChangeService } from './work-order-material-change.service';
import { ResolveScopeMismatchInput, WorkOrderScopeMismatchService } from './work-order-scope-mismatch.service';
import { ChangeWorkOrderStatusInput, CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrderAlert, WorkOrdersService } from './work-orders.service';
import { UpdateAccessReadinessInput, WorkOrderAccessReadinessService } from './work-order-access-readiness.service';
import { CreateTemporaryCredentialInput, ReviewTemporaryCredentialInput, WorkOrderTemporaryAccessCredentialsService } from './work-order-temporary-access-credentials.service';
import { InitiateAccessRecoveryInput, RegisterRecoveryCandidateInput, WorkOrderAccessRecoveryService } from './work-order-access-recovery.service';
import { ReviewIncidentInput, WorkOrderIncidentService } from './work-order-incident.service';
import { ExecutionEvidenceAccessService } from '../execution-evidence/execution-evidence-access.service';
import { AuthorizeCompletionCorrectionInput, WorkOrderCompletionCorrectionService } from './work-order-completion-correction.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(
    private readonly workOrders: WorkOrdersService,
    private readonly materialChanges: WorkOrderMaterialChangeService,
    private readonly scopeMismatches: WorkOrderScopeMismatchService,
    private readonly accessReadiness: WorkOrderAccessReadinessService,
    private readonly temporaryCredentials: WorkOrderTemporaryAccessCredentialsService,
    private readonly accessRecovery: WorkOrderAccessRecoveryService,
    private readonly incidents: WorkOrderIncidentService,
    private readonly evidenceAccess: ExecutionEvidenceAccessService,
    private readonly completionCorrections: WorkOrderCompletionCorrectionService,
  ) {}

  @Get(':id/completion-corrections')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  completionCorrectionHistory(@Param('id',new ParseUUIDPipe()) id:string){return this.completionCorrections.list(id);}

  @Post(':id/completion-corrections')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  authorizeCompletionCorrection(@Param('id',new ParseUUIDPipe()) id:string,@Body() input:AuthorizeCompletionCorrectionInput,@CurrentUser() actor:User){return this.completionCorrections.authorize(id,input,actor);}

  @Get(':id/execution-evidence/:evidenceId/access')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  executionEvidenceAccess(@Param('id', new ParseUUIDPipe()) id:string,@Param('evidenceId',new ParseUUIDPipe()) evidenceId:string,@CurrentUser() actor:User){return this.evidenceAccess.managementAccess(id,evidenceId,actor.role);}

  @Get(':id/incidents')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  incidentsList(@Param('id', new ParseUUIDPipe()) id:string){return this.incidents.list(id);}

  @Post(':id/incidents/:incidentId/review')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  reviewIncident(@Param('id',new ParseUUIDPipe()) id:string,@Param('incidentId',new ParseUUIDPipe()) incidentId:string,@Body() input:ReviewIncidentInput,@CurrentUser() actor:User){return this.incidents.review(id,incidentId,input,actor.id);}

  @Get(':id/access-recovery')
  @Roles(UserRole.ADMIN)
  accessRecoverySummary(@Param('id', new ParseUUIDPipe()) id:string){return this.accessRecovery.summary(id);}

  @Post(':id/access-recovery')
  @Roles(UserRole.ADMIN)
  initiateAccessRecovery(@Param('id', new ParseUUIDPipe()) id:string,@Body() input:InitiateAccessRecoveryInput,@CurrentUser() actor:User){return this.accessRecovery.initiate(id,input,actor.id);}

  @Post(':id/access-recovery/:recoveryId/credential-candidate')
  @Roles(UserRole.ADMIN)
  registerAccessRecoveryCandidate(@Param('id',new ParseUUIDPipe()) id:string,@Param('recoveryId',new ParseUUIDPipe()) recoveryId:string,@Body() input:RegisterRecoveryCandidateInput,@CurrentUser() actor:User){return this.accessRecovery.registerCandidate(id,recoveryId,input,actor.id);}

  @Get(':id/temporary-access-credentials')
  @Roles(UserRole.ADMIN)
  temporaryCredentialList(@Param('id', new ParseUUIDPipe()) id:string,@CurrentUser() actor:User){return this.temporaryCredentials.list(id,actor.id);}

  @Post(':id/temporary-access-credentials')
  @Roles(UserRole.ADMIN)
  createTemporaryCredential(@Param('id',new ParseUUIDPipe()) id:string,@Body() input:CreateTemporaryCredentialInput,@CurrentUser() actor:User){return this.temporaryCredentials.create(id,input,actor.id);}

  @Post(':id/temporary-access-credentials/:credentialId/reveal')
  @Roles(UserRole.ADMIN)
  revealTemporaryCredential(@Param('id',new ParseUUIDPipe()) id:string,@Param('credentialId',new ParseUUIDPipe()) credentialId:string,@CurrentUser() actor:User){return this.temporaryCredentials.reveal(id,credentialId,actor.id);}

  @Post(':id/temporary-access-credentials/:credentialId/review')
  @Roles(UserRole.ADMIN)
  reviewTemporaryCredential(@Param('id',new ParseUUIDPipe()) id:string,@Param('credentialId',new ParseUUIDPipe()) credentialId:string,@Body() input:ReviewTemporaryCredentialInput,@CurrentUser() actor:User){return this.temporaryCredentials.review(id,credentialId,input,actor.id);}

  @Post(':id/temporary-access-credentials/:credentialId/revoke')
  @Roles(UserRole.ADMIN)
  revokeTemporaryCredential(@Param('id',new ParseUUIDPipe()) id:string,@Param('credentialId',new ParseUUIDPipe()) credentialId:string,@Body() input:{reason?:string},@CurrentUser() actor:User){return this.temporaryCredentials.revoke(id,credentialId,input.reason,actor.id);}

  @Get(':id/access-readiness/history')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  accessReadinessHistory(@Param('id', new ParseUUIDPipe()) id: string) { return this.accessReadiness.history(id); }

  @Patch(':id/access-readiness')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateAccessReadiness(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateAccessReadinessInput, @CurrentUser() actor: User) {
    return this.accessReadiness.update(id, input, actor.id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() input: CreateWorkOrderInput) { return this.workOrders.create(input); }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: WorkOrderStatus,
    @Query('priority') priority?: WorkOrderPriority,
    @Query('customerId', new ParseUUIDPipe({ optional: true })) customerId?: string,
    @Query('propertyId', new ParseUUIDPipe({ optional: true })) propertyId?: string,
    @Query('technicianId', new ParseUUIDPipe({ optional: true })) technicianId?: string,
    @Query('crewId', new ParseUUIDPipe({ optional: true })) crewId?: string,
    @Query('alert') alert?: WorkOrderAlert,
  ) { return this.workOrders.findAll(page, pageSize, search, status, priority, customerId, propertyId, technicianId, crewId, alert); }

  @Get(':id/timeline')
  findTimeline(@Param('id', new ParseUUIDPipe()) id: string) { return this.workOrders.findTimeline(id); }

  @Post(':id/completion/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  acknowledgeCompletion(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: User) {
    return this.workOrders.acknowledgeCompletion(id, actor.id);
  }

  @Get(':id/scope-mismatches')
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.SUPERVISOR)
  listScopeMismatches(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.scopeMismatches.list(id);
  }

  @Post(':id/scope-mismatches/:eventId/resolve')
  @Roles(UserRole.ADMIN)
  resolveScopeMismatch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: ResolveScopeMismatchInput,
    @CurrentUser() actor: User,
  ) { return this.scopeMismatches.resolve(id, eventId, input, actor.id); }

  @Post(':id/material-change/preview')
  @Roles(UserRole.ADMIN)
  previewMaterialChange(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: MaterialChangePreviewInput) {
    return this.materialChanges.preview(id, input);
  }

  @Post(':id/material-change')
  @Roles(UserRole.ADMIN)
  commitMaterialChange(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: MaterialChangeCommitInput, @CurrentUser() actor: User) {
    return this.materialChanges.commit(id, input, actor.id);
  }

  @Get(':id/material-changes')
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.DISPATCHER, UserRole.SUPERVISOR)
  listMaterialChanges(@Param('id', new ParseUUIDPipe()) id: string) { return this.materialChanges.list(id); }

  @Patch(':id/status')
  async changeStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: ChangeWorkOrderStatusInput) {
    await this.materialChanges.assertGenericCancellationAllowed(id, input.status);
    return this.workOrders.changeStatus(id, input);
  }

  @Patch(':id/assignment')
  @Roles(UserRole.ADMIN)
  assignTechnicians(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: { technicianIds: string[]; crewId?: string | null; jobLeaderId?: string | null },
    @CurrentUser() actor: User,
  ) { return this.workOrders.assignTechnicians(id, input.technicianIds ?? [], input.crewId, input.jobLeaderId, actor.id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateWorkOrderInput) {
    await this.materialChanges.assertGenericUpdateAllowed(id, input);
    return this.workOrders.update(id, input);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.workOrders.findOne(id); }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.workOrders.remove(id); }
}
