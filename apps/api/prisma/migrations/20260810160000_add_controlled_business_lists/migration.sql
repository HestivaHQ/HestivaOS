CREATE TYPE "BusinessListType" AS ENUM ('JOB_TITLE', 'DEPARTMENT');

CREATE TABLE "business_list_options" (
  "id" UUID NOT NULL,
  "type" "BusinessListType" NOT NULL,
  "label" TEXT NOT NULL,
  "normalized_label" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_list_options_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_list_options_type_normalized_label_key" ON "business_list_options"("type", "normalized_label");
CREATE INDEX "business_list_options_type_is_active_sort_order_idx" ON "business_list_options"("type", "is_active", "sort_order");
ALTER TABLE "employee_records" ADD COLUMN "job_title_option_id" UUID, ADD COLUMN "department_option_id" UUID;
CREATE INDEX "employee_records_job_title_option_id_idx" ON "employee_records"("job_title_option_id");
CREATE INDEX "employee_records_department_option_id_idx" ON "employee_records"("department_option_id");
ALTER TABLE "employee_records" ADD CONSTRAINT "employee_records_job_title_option_id_fkey" FOREIGN KEY ("job_title_option_id") REFERENCES "business_list_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_records" ADD CONSTRAINT "employee_records_department_option_id_fkey" FOREIGN KEY ("department_option_id") REFERENCES "business_list_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
