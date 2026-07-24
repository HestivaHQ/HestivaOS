CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_duration_minutes" INTEGER,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "services_name_key" ON "services"("name");
CREATE INDEX "services_name_idx" ON "services"("name");
CREATE INDEX "services_status_idx" ON "services"("status");
