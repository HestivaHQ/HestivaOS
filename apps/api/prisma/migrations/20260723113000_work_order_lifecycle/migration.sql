-- Replace legacy workflow values without losing existing work order records.
CREATE TYPE "WorkOrderStatus_new" AS ENUM (
  'NEW', 'ASSIGNED', 'ACCEPTED', 'TRAVELLING', 'ON_SITE',
  'WAITING_FOR_PARTS', 'COMPLETED', 'CLOSED', 'CANCELLED'
);

ALTER TABLE "work_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "work_orders"
  ALTER COLUMN "status" TYPE "WorkOrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'DRAFT' THEN 'NEW'
      WHEN 'OPEN' THEN 'NEW'
      WHEN 'SCHEDULED' THEN 'ASSIGNED'
      WHEN 'IN_PROGRESS' THEN 'ON_SITE'
      WHEN 'ON_HOLD' THEN 'WAITING_FOR_PARTS'
      WHEN 'COMPLETED' THEN 'COMPLETED'
      WHEN 'CANCELLED' THEN 'CANCELLED'
    END
  )::"WorkOrderStatus_new";
ALTER TABLE "work_orders" ALTER COLUMN "status" SET DEFAULT 'NEW';
DROP TYPE "WorkOrderStatus";
ALTER TYPE "WorkOrderStatus_new" RENAME TO "WorkOrderStatus";

CREATE TYPE "WorkOrderActivityType" AS ENUM (
  'WORK_ORDER_CREATED', 'STATUS_CHANGED', 'TECHNICIAN_ASSIGNED',
  'TECHNICIAN_CHANGED', 'TECHNICIAN_REMOVED', 'WORK_ORDER_CLOSED',
  'WORK_ORDER_CANCELLED'
);

CREATE TABLE "work_order_activities" (
  "id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "type" "WorkOrderActivityType" NOT NULL,
  "previous_status" "WorkOrderStatus",
  "new_status" "WorkOrderStatus",
  "note" TEXT,
  "actor_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_activities_work_order_id_fkey"
    FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_order_activities_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "work_order_activities_work_order_id_idx" ON "work_order_activities"("work_order_id");
CREATE INDEX "work_order_activities_created_at_idx" ON "work_order_activities"("created_at");
CREATE INDEX "work_order_activities_work_order_id_created_at_idx" ON "work_order_activities"("work_order_id", "created_at");
