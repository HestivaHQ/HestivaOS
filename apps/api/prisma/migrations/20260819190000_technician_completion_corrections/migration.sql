CREATE TYPE "WorkOrderCompletionCorrectionStatus" AS ENUM ('AUTHORIZED', 'IN_PROGRESS', 'RESUBMITTED');

CREATE TABLE "work_order_completion_corrections" (
  "id" UUID NOT NULL,
  "authorization_operation_id" UUID NOT NULL,
  "authorization_request_hash" TEXT NOT NULL,
  "work_order_id" UUID NOT NULL,
  "technician_id" UUID NOT NULL,
  "authorized_by_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "affected_section_ids" UUID[] NOT NULL,
  "status" "WorkOrderCompletionCorrectionStatus" NOT NULL DEFAULT 'AUTHORIZED',
  "original_completion_operation_id" UUID NOT NULL,
  "original_field_completed_at" TIMESTAMP(3) NOT NULL,
  "original_completion_accepted_at" TIMESTAMP(3) NOT NULL,
  "prior_acknowledged_at" TIMESTAMP(3),
  "prior_acknowledged_by_id" UUID,
  "prior_correspondence_eligible_at" TIMESTAMP(3),
  "first_corrected_at" TIMESTAMP(3),
  "resubmission_operation_id" UUID,
  "resubmission_request_hash" TEXT,
  "resubmitted_at" TIMESTAMP(3),
  "field_resubmitted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_completion_corrections_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "execution_section_outcome_events" ADD COLUMN "correction_id" UUID;
CREATE UNIQUE INDEX "work_order_completion_corrections_authorization_operation_id_key" ON "work_order_completion_corrections"("authorization_operation_id");
CREATE UNIQUE INDEX "work_order_completion_corrections_resubmission_operation_id_key" ON "work_order_completion_corrections"("resubmission_operation_id");
CREATE UNIQUE INDEX "one_active_completion_correction_per_work_order" ON "work_order_completion_corrections"("work_order_id") WHERE "status" IN ('AUTHORIZED','IN_PROGRESS');
CREATE INDEX "work_order_completion_corrections_work_order_id_created_at_idx" ON "work_order_completion_corrections"("work_order_id", "created_at");
CREATE INDEX "work_order_completion_corrections_technician_id_created_at_idx" ON "work_order_completion_corrections"("technician_id", "created_at");
CREATE INDEX "execution_section_outcome_events_correction_id_server_received_at_idx" ON "execution_section_outcome_events"("correction_id", "server_received_at");
ALTER TABLE "work_order_completion_corrections" ADD CONSTRAINT "work_order_completion_corrections_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_completion_corrections" ADD CONSTRAINT "work_order_completion_corrections_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_completion_corrections" ADD CONSTRAINT "work_order_completion_corrections_authorized_by_id_fkey" FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "execution_section_outcome_events" ADD CONSTRAINT "execution_section_outcome_events_correction_id_fkey" FOREIGN KEY ("correction_id") REFERENCES "work_order_completion_corrections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
