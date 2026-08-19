ALTER TABLE "recurring_service_agreements"
ADD COLUMN "auto_resume_date" DATE;

CREATE INDEX "recurring_service_agreements_status_auto_resume_date_idx"
ON "recurring_service_agreements"("status", "auto_resume_date");
