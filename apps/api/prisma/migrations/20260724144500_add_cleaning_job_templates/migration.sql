CREATE TYPE "CleaningJobTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "cleaning_job_templates" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "estimated_duration_minutes" INTEGER,
  "status" "CleaningJobTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cleaning_job_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_CleaningJobTemplateToService" (
  "A" UUID NOT NULL,
  "B" UUID NOT NULL
);

CREATE UNIQUE INDEX "cleaning_job_templates_name_key" ON "cleaning_job_templates"("name");
CREATE INDEX "cleaning_job_templates_name_idx" ON "cleaning_job_templates"("name");
CREATE INDEX "cleaning_job_templates_status_idx" ON "cleaning_job_templates"("status");
CREATE UNIQUE INDEX "_CleaningJobTemplateToService_AB_unique" ON "_CleaningJobTemplateToService"("A", "B");
CREATE INDEX "_CleaningJobTemplateToService_B_index" ON "_CleaningJobTemplateToService"("B");

ALTER TABLE "_CleaningJobTemplateToService" ADD CONSTRAINT "_CleaningJobTemplateToService_A_fkey" FOREIGN KEY ("A") REFERENCES "cleaning_job_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CleaningJobTemplateToService" ADD CONSTRAINT "_CleaningJobTemplateToService_B_fkey" FOREIGN KEY ("B") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;