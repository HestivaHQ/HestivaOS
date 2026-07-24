CREATE TYPE "WorkerPayType" AS ENUM ('DAILY', 'HOURLY');
CREATE TYPE "LabourAdjustmentKind" AS ENUM ('ALLOWANCE', 'DEDUCTION');
CREATE TYPE "LabourAdjustmentCalculation" AS ENUM ('FIXED', 'PER_HOUR', 'PER_DAY');

CREATE TABLE "technician_rates" (
  "id" UUID NOT NULL,
  "technician_id" UUID NOT NULL,
  "pay_type" "WorkerPayType" NOT NULL,
  "daily_rate" DECIMAL(12,2),
  "hourly_rate" DECIMAL(12,2),
  "standard_hours_per_day" DECIMAL(5,2) NOT NULL DEFAULT 8,
  "overtime_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
  "weekend_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1,
  "public_holiday_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_to" TIMESTAMP(3),
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technician_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "technician_rates_positive_values" CHECK (
    "standard_hours_per_day" > 0 AND "overtime_multiplier" >= 1 AND
    "weekend_multiplier" >= 0 AND "public_holiday_multiplier" >= 0 AND
    ("daily_rate" IS NULL OR "daily_rate" >= 0) AND
    ("hourly_rate" IS NULL OR "hourly_rate" >= 0) AND
    ("effective_to" IS NULL OR "effective_to" > "effective_from")
  )
);

CREATE TABLE "labour_adjustment_definitions" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "LabourAdjustmentKind" NOT NULL,
  "calculation" "LabourAdjustmentCalculation" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "labour_adjustment_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "labour_adjustment_definitions_amount_nonnegative" CHECK ("amount" >= 0)
);

CREATE TABLE "shift_labour_adjustments" (
  "id" UUID NOT NULL,
  "shift_id" UUID NOT NULL,
  "technician_id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "amount_override" DECIMAL(12,2),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shift_labour_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shift_labour_adjustments_override_nonnegative" CHECK ("amount_override" IS NULL OR "amount_override" >= 0)
);

CREATE UNIQUE INDEX "labour_adjustment_definitions_name_key" ON "labour_adjustment_definitions"("name");
CREATE UNIQUE INDEX "shift_labour_adjustments_shift_id_technician_id_definition_id_key" ON "shift_labour_adjustments"("shift_id", "technician_id", "definition_id");
CREATE INDEX "technician_rates_technician_id_effective_from_idx" ON "technician_rates"("technician_id", "effective_from");
CREATE INDEX "labour_adjustment_definitions_is_active_idx" ON "labour_adjustment_definitions"("is_active");
CREATE INDEX "shift_labour_adjustments_shift_id_idx" ON "shift_labour_adjustments"("shift_id");
CREATE INDEX "shift_labour_adjustments_technician_id_idx" ON "shift_labour_adjustments"("technician_id");

ALTER TABLE "technician_rates" ADD CONSTRAINT "technician_rates_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_labour_adjustments" ADD CONSTRAINT "shift_labour_adjustments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_labour_adjustments" ADD CONSTRAINT "shift_labour_adjustments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_labour_adjustments" ADD CONSTRAINT "shift_labour_adjustments_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "labour_adjustment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;