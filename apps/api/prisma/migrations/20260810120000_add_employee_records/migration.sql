CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "employee_records" (
    "id" UUID NOT NULL,
    "employee_reference" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "preferred_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "residential_address" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_relationship" TEXT,
    "emergency_contact_phone" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "job_title" TEXT,
    "department" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "internal_notes" TEXT,
    "user_id" UUID,
    "technician_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employee_records_employee_reference_key" ON "employee_records"("employee_reference");
CREATE UNIQUE INDEX "employee_records_user_id_key" ON "employee_records"("user_id");
CREATE UNIQUE INDEX "employee_records_technician_id_key" ON "employee_records"("technician_id");
CREATE INDEX "employee_records_last_name_first_name_idx" ON "employee_records"("last_name", "first_name");
CREATE INDEX "employee_records_status_idx" ON "employee_records"("status");
ALTER TABLE "employee_records" ADD CONSTRAINT "employee_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_records" ADD CONSTRAINT "employee_records_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
