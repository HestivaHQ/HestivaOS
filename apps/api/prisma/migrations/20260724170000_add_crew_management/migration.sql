CREATE TYPE "CrewStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TYPE "WorkOrderActivityType" ADD VALUE IF NOT EXISTS 'CREW_ASSIGNED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE IF NOT EXISTS 'CREW_CHANGED';
ALTER TYPE "WorkOrderActivityType" ADD VALUE IF NOT EXISTS 'CREW_REMOVED';

CREATE TABLE "crews" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "leader_id" UUID,
  "status" "CrewStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crew_members" (
  "crew_id" UUID NOT NULL,
  "technician_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crew_members_pkey" PRIMARY KEY ("crew_id", "technician_id")
);

ALTER TABLE "work_orders" ADD COLUMN "crew_id" UUID;

CREATE UNIQUE INDEX "crews_name_key" ON "crews"("name");
CREATE INDEX "crews_status_idx" ON "crews"("status");
CREATE UNIQUE INDEX "crew_members_technician_id_key" ON "crew_members"("technician_id");
CREATE INDEX "crew_members_crew_id_idx" ON "crew_members"("crew_id");
CREATE INDEX "work_orders_crew_id_idx" ON "work_orders"("crew_id");

ALTER TABLE "crews" ADD CONSTRAINT "crews_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
