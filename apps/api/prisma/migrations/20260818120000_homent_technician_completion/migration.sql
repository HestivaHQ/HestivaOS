ALTER TYPE "WorkOrderActivityType" ADD VALUE 'JOB_COMPLETED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE 'JOB_COMPLETION_ACKNOWLEDGED';

ALTER TABLE "work_orders"
  ADD COLUMN "completion_operation_id" UUID,
  ADD COLUMN "completed_by_technician_id" UUID,
  ADD COLUMN "field_completed_at" TIMESTAMP(3),
  ADD COLUMN "completion_accepted_at" TIMESTAMP(3),
  ADD COLUMN "completion_acknowledged_at" TIMESTAMP(3),
  ADD COLUMN "completion_acknowledged_by_id" UUID,
  ADD COLUMN "completion_correspondence_eligible_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "work_orders_completion_operation_id_key" ON "work_orders"("completion_operation_id");
CREATE INDEX "work_orders_completed_by_technician_id_idx" ON "work_orders"("completed_by_technician_id");
CREATE INDEX "work_orders_completion_acknowledged_by_id_idx" ON "work_orders"("completion_acknowledged_by_id");
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_completed_by_technician_id_fkey" FOREIGN KEY ("completed_by_technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_completion_acknowledged_by_id_fkey" FOREIGN KEY ("completion_acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
