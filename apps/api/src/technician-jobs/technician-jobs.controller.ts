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

@Controller("technician/jobs")
export class TechnicianJobsController {
  constructor(private readonly jobs: TechnicianJobsService) {}

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
  @Get(":id/review") review(
    @CurrentUser() user: User,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.jobs.review(user.id, id);
  }
}
