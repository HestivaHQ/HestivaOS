CREATE TYPE "WorkOrderChecklistItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'NOT_APPLICABLE');

CREATE TABLE "work_order_checklist_items" (
  "id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "status" "WorkOrderChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_order_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_order_checklist_items_work_order_id_sort_order_idx"
ON "work_order_checklist_items"("work_order_id", "sort_order");

ALTER TABLE "work_order_checklist_items"
ADD CONSTRAINT "work_order_checklist_items_work_order_id_fkey"
FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
