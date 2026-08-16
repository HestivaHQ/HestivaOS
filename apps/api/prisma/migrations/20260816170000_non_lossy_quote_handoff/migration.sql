CREATE TYPE "BuildingAccessMethod" AS ENUM ('ELEVATOR', 'STAIRS', 'ELEVATOR_AND_STAIRS');
CREATE TYPE "ComplexAccessMethod" AS ENUM ('ACCESS_CODE', 'NOT_APPLICABLE', 'VISITOR_SIGN_IN', 'RESIDENT_ARRANGED');
CREATE TYPE "KeyHandoverMethod" AS ENUM ('SOMEONE_WILL_OPEN', 'CONCIERGE_RECEPTION', 'TO_BE_ARRANGED');
CREATE TYPE "TemporaryAccessCredentialType" AS ENUM ('CODE', 'QR_IMAGE', 'QR_DOCUMENT', 'OTHER');

ALTER TABLE "work_orders"
  ADD COLUMN "preferred_time_window" "PreferredTimeWindow",
  ADD COLUMN "alternative_date" DATE,
  ADD COLUMN "date_flexibility" TEXT,
  ADD COLUMN "urgency" TEXT,
  ADD COLUMN "exact_floor" INTEGER,
  ADD COLUMN "building_access" "BuildingAccessMethod",
  ADD COLUMN "complex_access" "ComplexAccessMethod",
  ADD COLUMN "access_instructions" TEXT,
  ADD COLUMN "parking_instructions" TEXT,
  ADD COLUMN "key_handover" "KeyHandoverMethod",
  ADD COLUMN "key_handover_details" TEXT,
  ADD COLUMN "someone_present" BOOLEAN,
  ADD COLUMN "eco_friendly_products" BOOLEAN,
  ADD COLUMN "customer_declared_existing_damage" TEXT;

ALTER TABLE "recurring_service_agreements"
  ADD COLUMN "eco_friendly_products" BOOLEAN;

CREATE TABLE "work_order_temporary_access_credentials" (
  "id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "type" "TemporaryAccessCredentialType" NOT NULL,
  "secret_value" TEXT,
  "attachment_storage_path" TEXT,
  "valid_from" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "single_use" BOOLEAN NOT NULL DEFAULT false,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_order_temporary_access_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_temporary_access_credentials_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "work_order_temporary_access_credentials_work_order_id_expires_at_idx" ON "work_order_temporary_access_credentials"("work_order_id", "expires_at");

CREATE TABLE "work_order_quote_evidence" (
  "work_order_id" UUID NOT NULL,
  "quote_photo_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_quote_evidence_pkey" PRIMARY KEY ("work_order_id", "quote_photo_id"),
  CONSTRAINT "work_order_quote_evidence_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_order_quote_evidence_quote_photo_id_fkey" FOREIGN KEY ("quote_photo_id") REFERENCES "quote_photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "work_order_quote_evidence_quote_photo_id_idx" ON "work_order_quote_evidence"("quote_photo_id");
