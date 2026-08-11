CREATE TYPE "RecurringServiceAgreementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'ENDED');
CREATE TYPE "RecurrenceWeekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
CREATE TYPE "PreferredTimeWindow" AS ENUM ('MORNING', 'MIDDAY', 'AFTERNOON', 'FLEXIBLE');

CREATE TABLE "recurring_service_agreements" (
  "id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "service_id" UUID NOT NULL,
  "frequency" "WorkOrderFrequency" NOT NULL,
  "status" "RecurringServiceAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_date" DATE NOT NULL,
  "end_date" DATE,
  "weekday" "RecurrenceWeekday",
  "day_of_month" INTEGER,
  "preferred_time_window" "PreferredTimeWindow",
  "custom_frequency_note" TEXT,
  "recurring_instructions" TEXT,
  "next_service_date" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recurring_service_agreements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recurring_service_agreements_day_of_month_check" CHECK ("day_of_month" IS NULL OR "day_of_month" BETWEEN 1 AND 31)
);
CREATE TABLE "recurring_service_agreement_add_ons" (
  "recurring_agreement_id" UUID NOT NULL,
  "service_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurring_service_agreement_add_ons_pkey" PRIMARY KEY ("recurring_agreement_id", "service_id")
);
ALTER TABLE "work_orders" ADD COLUMN "recurring_agreement_id" UUID, ADD COLUMN "recurrence_date" DATE;
CREATE INDEX "recurring_service_agreements_property_id_idx" ON "recurring_service_agreements"("property_id");
CREATE INDEX "recurring_service_agreements_service_id_idx" ON "recurring_service_agreements"("service_id");
CREATE INDEX "recurring_service_agreements_status_next_service_date_idx" ON "recurring_service_agreements"("status", "next_service_date");
CREATE INDEX "recurring_service_agreement_add_ons_service_id_idx" ON "recurring_service_agreement_add_ons"("service_id");
CREATE INDEX "work_orders_recurring_agreement_id_idx" ON "work_orders"("recurring_agreement_id");
CREATE UNIQUE INDEX "work_orders_recurring_agreement_id_recurrence_date_key" ON "work_orders"("recurring_agreement_id", "recurrence_date");
ALTER TABLE "recurring_service_agreements" ADD CONSTRAINT "recurring_service_agreements_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_service_agreements" ADD CONSTRAINT "recurring_service_agreements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_service_agreement_add_ons" ADD CONSTRAINT "recurring_service_agreement_add_ons_recurring_agreement_id_fkey" FOREIGN KEY ("recurring_agreement_id") REFERENCES "recurring_service_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_service_agreement_add_ons" ADD CONSTRAINT "recurring_service_agreement_add_ons_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_recurring_agreement_id_fkey" FOREIGN KEY ("recurring_agreement_id") REFERENCES "recurring_service_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
