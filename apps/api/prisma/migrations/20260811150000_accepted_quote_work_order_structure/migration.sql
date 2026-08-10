CREATE TYPE "WorkOrderFrequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'EVERY_TWO_WEEKS', 'MONTHLY', 'CUSTOM');
CREATE TYPE "HomeCondition" AS ENUM ('LIGHT_UPKEEP', 'STANDARD', 'EXTRA_ATTENTION', 'HEAVY_BUILDUP', 'RECENTLY_RENOVATED', 'VACANT', 'MOVE_IN_OUT');

ALTER TABLE "work_orders"
  ADD COLUMN "frequency" "WorkOrderFrequency",
  ADD COLUMN "custom_frequency_note" TEXT,
  ADD COLUMN "home_condition" "HomeCondition";

CREATE TABLE "work_order_add_ons" (
  "work_order_id" UUID NOT NULL,
  "service_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_add_ons_pkey" PRIMARY KEY ("work_order_id", "service_id"),
  CONSTRAINT "work_order_add_ons_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_order_add_ons_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "work_order_add_ons_service_id_idx" ON "work_order_add_ons"("service_id");
