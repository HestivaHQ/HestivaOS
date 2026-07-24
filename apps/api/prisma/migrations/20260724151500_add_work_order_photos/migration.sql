CREATE TYPE "WorkOrderPhotoCategory" AS ENUM ('BEFORE', 'AFTER');

CREATE TABLE "work_order_photos" (
  "id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "category" "WorkOrderPhotoCategory" NOT NULL,
  "url" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_order_photos_work_order_id_category_created_at_idx"
ON "work_order_photos"("work_order_id", "category", "created_at");

ALTER TABLE "work_order_photos"
ADD CONSTRAINT "work_order_photos_work_order_id_fkey"
FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
