-- CreateEnum
CREATE TYPE "ServiceScopeTemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ExecutionEvidencePolicy" AS ENUM ('NONE', 'ON_EXCEPTION', 'REQUIRED');

-- CreateEnum
CREATE TYPE "ExecutionSectionOutcome" AS ENUM ('PENDING', 'COMPLETED', 'NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "ExecutionExceptionReason" AS ENUM ('CUSTOMER_DECLINED', 'INACCESSIBLE', 'SAFETY_CONCERN', 'PRE_EXISTING_CONDITION_OR_DAMAGE', 'REQUIRED_RESOURCE_UNAVAILABLE', 'SCOPE_OR_CONDITION_MISMATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "ExecutionAttentionLevel" AS ENUM ('INFORMATIONAL', 'JOB_LEADER_ATTENTION', 'SAFETY_CRITICAL_STOP');

-- CreateEnum
CREATE TYPE "EvidenceSyncState" AS ENUM ('CAPTURED_LOCAL', 'QUEUED', 'UPLOADING', 'SERVER_ACKNOWLEDGED', 'RETRY_PENDING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkOrderActivityType" ADD VALUE 'EXECUTION_SCOPE_REVISED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE 'SECTION_OUTCOME_RECORDED';

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "started_scope_revision_id" UUID;

-- CreateTable
CREATE TABLE "service_scope_templates" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_scope_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_scope_template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ServiceScopeTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_scope_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_scope_template_sections" (
    "id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "stable_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence_policy" "ExecutionEvidencePolicy" NOT NULL DEFAULT 'NONE',
    "repeat_by_property_field" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_scope_template_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_execution_scope_revisions" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "additions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_execution_scope_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_execution_sections" (
    "id" UUID NOT NULL,
    "scope_revision_id" UUID NOT NULL,
    "template_section_id" UUID,
    "stable_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence_policy" "ExecutionEvidencePolicy" NOT NULL DEFAULT 'NONE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "current_outcome" "ExecutionSectionOutcome" NOT NULL DEFAULT 'PENDING',
    "current_outcome_event_id" UUID,
    "current_version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "work_order_execution_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_section_outcome_events" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "outcome" "ExecutionSectionOutcome" NOT NULL,
    "reason" "ExecutionExceptionReason",
    "note" TEXT,
    "attention_level" "ExecutionAttentionLevel" NOT NULL DEFAULT 'INFORMATIONAL',
    "field_recorded_at" TIMESTAMP(3) NOT NULL,
    "expected_section_version" INTEGER NOT NULL,
    "server_received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_section_outcome_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_section_evidence" (
    "id" UUID NOT NULL,
    "local_evidence_id" TEXT NOT NULL,
    "section_id" UUID NOT NULL,
    "outcome_event_id" UUID,
    "sync_state" "EvidenceSyncState" NOT NULL DEFAULT 'CAPTURED_LOCAL',
    "captured_at" TIMESTAMP(3) NOT NULL,
    "server_acknowledged_at" TIMESTAMP(3),

    CONSTRAINT "execution_section_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_scope_templates_service_id_name_key" ON "service_scope_templates"("service_id", "name");

-- CreateIndex
CREATE INDEX "service_scope_template_versions_template_id_status_idx" ON "service_scope_template_versions"("template_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_scope_template_versions_template_id_version_key" ON "service_scope_template_versions"("template_id", "version");

-- CreateIndex
CREATE INDEX "service_scope_template_sections_template_version_id_sort_or_idx" ON "service_scope_template_sections"("template_version_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_scope_template_sections_template_version_id_stable__key" ON "service_scope_template_sections"("template_version_id", "stable_key");

-- CreateIndex
CREATE INDEX "work_order_execution_scope_revisions_work_order_id_created__idx" ON "work_order_execution_scope_revisions"("work_order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_execution_scope_revisions_work_order_id_revision_key" ON "work_order_execution_scope_revisions"("work_order_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_execution_sections_current_outcome_event_id_key" ON "work_order_execution_sections"("current_outcome_event_id");

-- CreateIndex
CREATE INDEX "work_order_execution_sections_scope_revision_id_sort_order_idx" ON "work_order_execution_sections"("scope_revision_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_execution_sections_scope_revision_id_stable_key_key" ON "work_order_execution_sections"("scope_revision_id", "stable_key");

-- CreateIndex
CREATE UNIQUE INDEX "execution_section_outcome_events_operation_id_key" ON "execution_section_outcome_events"("operation_id");

-- CreateIndex
CREATE INDEX "execution_section_outcome_events_section_id_server_received_idx" ON "execution_section_outcome_events"("section_id", "server_received_at");

-- CreateIndex
CREATE UNIQUE INDEX "execution_section_evidence_local_evidence_id_key" ON "execution_section_evidence"("local_evidence_id");

-- CreateIndex
CREATE INDEX "execution_section_evidence_section_id_sync_state_idx" ON "execution_section_evidence"("section_id", "sync_state");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_started_scope_revision_id_key" ON "work_orders"("started_scope_revision_id");

-- AddForeignKey
ALTER TABLE "service_scope_templates" ADD CONSTRAINT "service_scope_templates_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_scope_template_versions" ADD CONSTRAINT "service_scope_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "service_scope_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_scope_template_sections" ADD CONSTRAINT "service_scope_template_sections_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "service_scope_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_started_scope_revision_id_fkey" FOREIGN KEY ("started_scope_revision_id") REFERENCES "work_order_execution_scope_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_execution_scope_revisions" ADD CONSTRAINT "work_order_execution_scope_revisions_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_execution_scope_revisions" ADD CONSTRAINT "work_order_execution_scope_revisions_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "service_scope_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_execution_sections" ADD CONSTRAINT "work_order_execution_sections_scope_revision_id_fkey" FOREIGN KEY ("scope_revision_id") REFERENCES "work_order_execution_scope_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_execution_sections" ADD CONSTRAINT "work_order_execution_sections_template_section_id_fkey" FOREIGN KEY ("template_section_id") REFERENCES "service_scope_template_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_execution_sections" ADD CONSTRAINT "work_order_execution_sections_current_outcome_event_id_fkey" FOREIGN KEY ("current_outcome_event_id") REFERENCES "execution_section_outcome_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_section_outcome_events" ADD CONSTRAINT "execution_section_outcome_events_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "work_order_execution_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_section_outcome_events" ADD CONSTRAINT "execution_section_outcome_events_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_section_evidence" ADD CONSTRAINT "execution_section_evidence_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "work_order_execution_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_section_evidence" ADD CONSTRAINT "execution_section_evidence_outcome_event_id_fkey" FOREIGN KEY ("outcome_event_id") REFERENCES "execution_section_outcome_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
