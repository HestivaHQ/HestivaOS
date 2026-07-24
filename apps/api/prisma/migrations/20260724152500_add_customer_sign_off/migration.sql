CREATE TABLE "work_order_customer_sign_offs" (
  "id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "customer_name" TEXT NOT NULL,
  "signature_data_url" TEXT NOT NULL,
  "note" TEXT,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_customer_sign_offs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "work_order_customer_sign_offs_work_order_id_key" ON "work_order_customer_sign_offs"("work_order_id");
ALTER TABLE "work_order_customer_sign_offs" ADD CONSTRAINT "work_order_customer_sign_offs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;