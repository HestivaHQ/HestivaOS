CREATE TYPE "WorkOrderAccessReadiness" AS ENUM ('REQUIRED_MISSING', 'RECEIVED', 'NEEDS_REVIEW', 'EXPIRED', 'ARRANGED_ANOTHER_WAY', 'NOT_REQUIRED');

ALTER TYPE "WorkOrderActivityType" ADD VALUE 'ACCESS_READINESS_CHANGED';
ALTER TYPE "AttentionItemType" ADD VALUE 'WORK_ORDER_ACCESS_REQUIRED';

ALTER TABLE "work_orders"
ADD COLUMN "access_readiness" "WorkOrderAccessReadiness" NOT NULL DEFAULT 'NOT_REQUIRED';

CREATE TABLE "work_order_access_readiness_events" (
  "id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "previous_state" "WorkOrderAccessReadiness" NOT NULL,
  "new_state" "WorkOrderAccessReadiness" NOT NULL,
  "actor_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_access_readiness_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "work_order_access_readiness_events_work_order_id_created_at_idx" ON "work_order_access_readiness_events"("work_order_id", "created_at");
CREATE INDEX "work_order_access_readiness_events_actor_id_idx" ON "work_order_access_readiness_events"("actor_id");
ALTER TABLE "work_order_access_readiness_events" ADD CONSTRAINT "work_order_access_readiness_events_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_access_readiness_events" ADD CONSTRAINT "work_order_access_readiness_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
