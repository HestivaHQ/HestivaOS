CREATE TYPE "CompletionCorrectionStatus" AS ENUM ('AUTHORIZED', 'IN_PROGRESS', 'RESUBMITTED');
ALTER TYPE "WorkOrderActivityType" ADD VALUE 'COMPLETION_CORRECTION_AUTHORIZED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE 'COMPLETION_CORRECTION_STARTED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE 'COMPLETION_CORRECTION_RESUBMITTED';
CREATE TABLE "work_order_completion_corrections" (
  "id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "request_hash" TEXT NOT NULL,
  "work_order_id" UUID NOT NULL,
  "technician_id" UUID NOT NULL,
  "authorized_by_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "section_ids" UUID[] NOT NULL,
  "status" "CompletionCorrectionStatus" NOT NULL DEFAULT 'AUTHORIZED',
  "original_completion_operation_id" UUID NOT NULL,
  "original_completed_by_technician_id" UUID NOT NULL,
  "original_field_completed_at" TIMESTAMP(3) NOT NULL,
  "original_completion_accepted_at" TIMESTAMP(3) NOT NULL,
  "original_acknowledged_at" TIMESTAMP(3),
  "original_acknowledged_by_id" UUID,
  "original_correspondence_eligible_at" TIMESTAMP(3),
  "first_correction_at" TIMESTAMP(3),
  "resubmission_operation_id" UUID,
  "field_resubmitted_at" TIMESTAMP(3),
  "resubmitted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_completion_corrections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_completion_corrections_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_order_completion_corrections_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_order_completion_corrections_authorized_by_id_fkey" FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_order_completion_corrections_operation_id_key" ON "work_order_completion_corrections"("operation_id");
CREATE UNIQUE INDEX "work_order_completion_corrections_resubmission_operation_id_key" ON "work_order_completion_corrections"("resubmission_operation_id");
CREATE INDEX "work_order_completion_corrections_work_order_id_created_at_idx" ON "work_order_completion_corrections"("work_order_id", "created_at");
CREATE INDEX "work_order_completion_corrections_technician_id_status_idx" ON "work_order_completion_corrections"("technician_id", "status");
ALTER TABLE "execution_section_outcome_events" ADD COLUMN "correction_id" UUID;
ALTER TABLE "execution_section_outcome_events" ADD CONSTRAINT "execution_section_outcome_events_correction_id_fkey" FOREIGN KEY ("correction_id") REFERENCES "work_order_completion_corrections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "execution_section_outcome_events_correction_id_idx" ON "execution_section_outcome_events"("correction_id");
