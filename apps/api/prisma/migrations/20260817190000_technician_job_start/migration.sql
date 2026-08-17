ALTER TYPE "WorkOrderActivityType" ADD VALUE 'JOB_STARTED';
ALTER TABLE "work_orders"
  ADD COLUMN "started_at" TIMESTAMP(3),
  ADD COLUMN "started_by_technician_id" UUID,
  ADD COLUMN "start_operation_id" UUID;
CREATE UNIQUE INDEX "work_orders_start_operation_id_key" ON "work_orders"("start_operation_id");
CREATE INDEX "work_orders_started_by_technician_id_idx" ON "work_orders"("started_by_technician_id");
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_started_by_technician_id_fkey"
  FOREIGN KEY ("started_by_technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
