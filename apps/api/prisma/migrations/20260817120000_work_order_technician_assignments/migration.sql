CREATE TABLE "work_order_technicians" (
  "work_order_id" UUID NOT NULL,
  "technician_id" UUID NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_technicians_pkey" PRIMARY KEY ("work_order_id", "technician_id")
);

CREATE INDEX "work_order_technicians_technician_id_work_order_id_idx"
  ON "work_order_technicians"("technician_id", "work_order_id");

ALTER TABLE "work_order_technicians" ADD CONSTRAINT "work_order_technicians_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_order_technicians" ADD CONSTRAINT "work_order_technicians_technician_id_fkey"
  FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every historical single-technician assignment in the normalized assignment set.
INSERT INTO "work_order_technicians" ("work_order_id", "technician_id")
SELECT "id", "technician_id" FROM "work_orders" WHERE "technician_id" IS NOT NULL
ON CONFLICT DO NOTHING;
