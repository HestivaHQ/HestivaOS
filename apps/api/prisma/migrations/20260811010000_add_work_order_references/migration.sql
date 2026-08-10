-- Additive compatibility migration: historical work orders retain nullable references and services.
ALTER TABLE "work_orders" ADD COLUMN "reference" TEXT,
ADD COLUMN "service_id" UUID;

CREATE UNIQUE INDEX "work_orders_reference_key" ON "work_orders"("reference");
CREATE INDEX "work_orders_service_id_idx" ON "work_orders"("service_id");
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "work_order_daily_counters" (
  "business_date" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_order_daily_counters_pkey" PRIMARY KEY ("business_date")
);
