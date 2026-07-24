-- CreateTable
CREATE TABLE IF NOT EXISTS "work_order_checklist_items" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "status" "WorkOrderChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "work_order_photos" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "category" "WorkOrderPhotoCategory" NOT NULL,
    "url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "work_order_customer_sign_offs" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "signature_data_url" TEXT NOT NULL,
    "note" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_customer_sign_offs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_order_checklist_items_work_order_id_sort_order_idx"
ON "work_order_checklist_items"("work_order_id", "sort_order");

CREATE INDEX IF NOT EXISTS "work_order_photos_work_order_id_category_created_at_idx"
ON "work_order_photos"("work_order_id", "category", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "work_order_customer_sign_offs_work_order_id_key"
ON "work_order_customer_sign_offs"("work_order_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_order_checklist_items_work_order_id_fkey') THEN
        ALTER TABLE "work_order_checklist_items"
        ADD CONSTRAINT "work_order_checklist_items_work_order_id_fkey"
        FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_order_photos_work_order_id_fkey') THEN
        ALTER TABLE "work_order_photos"
        ADD CONSTRAINT "work_order_photos_work_order_id_fkey"
        FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_order_customer_sign_offs_work_order_id_fkey') THEN
        ALTER TABLE "work_order_customer_sign_offs"
        ADD CONSTRAINT "work_order_customer_sign_offs_work_order_id_fkey"
        FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
