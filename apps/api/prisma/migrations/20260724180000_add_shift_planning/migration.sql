CREATE TYPE "ShiftStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "unpaid_break_minutes" INTEGER NOT NULL DEFAULT 0,
    "crew_id" UUID,
    "technician_id" UUID,
    "work_order_id" UUID,
    "location" TEXT,
    "notes" TEXT,
    "status" "ShiftStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shifts_start_at_end_at_idx" ON "shifts"("start_at", "end_at");
CREATE INDEX "shifts_crew_id_start_at_idx" ON "shifts"("crew_id", "start_at");
CREATE INDEX "shifts_technician_id_start_at_idx" ON "shifts"("technician_id", "start_at");
CREATE INDEX "shifts_work_order_id_idx" ON "shifts"("work_order_id");
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

ALTER TABLE "shifts" ADD CONSTRAINT "shifts_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assignment_check" CHECK ("crew_id" IS NOT NULL OR "technician_id" IS NOT NULL);
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_time_check" CHECK ("end_at" > "start_at");
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_break_check" CHECK ("unpaid_break_minutes" >= 0);
