import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../users/current-user.decorator";
import {
  CompleteJobInput,
  EvidenceAcknowledgementInput,
  SectionOutcomeInput,
  StartJobInput,
  TechnicianJobsService,
  TechnicianListView,
} from "./technician-jobs.service";
import { ExecutionEvidenceAccessService } from '../execution-evidence/execution-evidence-access.service';
import { ResubmitCompletionCorrectionInput, WorkOrderCompletionCorrectionService } from '../work-orders/work-order-completion-correction.service';

@Controller("technician/jobs")
export class TechnicianJobsController {
  constructor(private readonly jobs: TechnicianJobsService, private readonly evidenceAccess: ExecutionEvidenceAccessService, private readonly completionCorrections: WorkOrderCompletionCorrectionService) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @Query("view") view: TechnicianListView = "today",
  ) {
    return this.jobs.list(user.id, view);
  }

  @Get(":id")
  brief(
    @CurrentUser() user: User,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.jobs.brief(user.id, id);
  }

  @Get(":id/evidence/:evidenceId/access")
  evidence(@CurrentUser() user: User,@Param("id",new ParseUUIDPipe()) id:string,@Param("evidenceId",new ParseUUIDPipe()) evidenceId:string){return this.evidenceAccess.technicianAccess(user.id,id,evidenceId);}

  @Post(":id/start")
  start(
    @CurrentUser() user: User,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: StartJobInput,
  ) {
    return this.jobs.start(user.id, id, input);
  }
  @Post(":id/sections/:sectionId/outcomes") outcome(
    @CurrentUser() user: User,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("sectionId", new ParseUUIDPipe()) sectionId: string,
    @Body() input: SectionOutcomeInput,
  ) {
    return this.jobs.recordSection(user.id, id, sectionId, input);
  }
  @Post(":id/sections/:sectionId/evidence/:evidenceId/acknowledge") acknowledge(
    @CurrentUser() user: User,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("sectionId", new ParseUUIDPipe()) sectionId: string,
    @Param("evidenceId", new ParseUUIDPipe()) evidenceId: string,
    @Body() input: EvidenceAcknowledgementInput,
  ) {
    return this.jobs.acknowledgeEvidence(
      user.id,
      id,
      sectionId,
      evidenceId,
      input,
    );
  }
  @Post(":id/complete") complete(
    @CurrentUser() user: User,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: CompleteJobInput,
  ) { return this.jobs.complete(user.id, id, input); }
  @Post(":id/completion-corrections/:correctionId/resubmit") resubmitCorrection(@CurrentUser() user:User,@Param("id",new ParseUUIDPipe()) id:string,@Param("correctionId",new ParseUUIDPipe()) correctionId:string,@Body() input:ResubmitCompletionCorrectionInput){return this.completionCorrections.resubmit(user.id,id,correctionId,input);}
  @Get(":id/review") review(
    @CurrentUser() user: User,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.jobs.review(user.id, id);
  }
}
