ALTER TYPE "WorkOrderActivityType" ADD VALUE 'JOB_LEADER_CHANGED';

ALTER TABLE "work_orders" ADD COLUMN "job_leader_id" UUID;
CREATE INDEX "work_orders_job_leader_id_idx" ON "work_orders"("job_leader_id");
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_job_leader_id_fkey"
  FOREIGN KEY ("job_leader_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A sole historical assignment establishes leadership without guessing. Multi-person
-- assignments remain unresolved (NULL) until an Admin explicitly selects a leader.
UPDATE "work_orders" wo SET "job_leader_id" = assignments."technician_id"
FROM (
  SELECT "work_order_id", MIN("technician_id"::text)::uuid AS "technician_id"
  FROM "work_order_technicians"
  GROUP BY "work_order_id"
  HAVING COUNT(*) = 1
) assignments
WHERE wo."id" = assignments."work_order_id";
