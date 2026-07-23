CREATE TYPE "TechnicianStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "technicians" (
  "id" UUID NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "status" "TechnicianStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technicians_email_key" ON "technicians"("email");
CREATE INDEX "technicians_last_name_first_name_idx" ON "technicians"("last_name", "first_name");

ALTER TABLE "work_orders" ADD COLUMN "technician_id" UUID;
CREATE INDEX "work_orders_technician_id_idx" ON "work_orders"("technician_id");
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
