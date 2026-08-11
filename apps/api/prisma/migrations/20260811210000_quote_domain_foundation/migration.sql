-- Slice 5M-A: authoritative Quote domain foundation.
CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'NEEDS_ATTENTION');
CREATE TYPE "QuoteRevisionOrigin" AS ENUM ('CUSTOMER_SUBMISSION', 'ADMIN_REVISION');
CREATE TYPE "QuoteLineItemType" AS ENUM ('PRIMARY_SERVICE', 'ADD_ON', 'ADJUSTMENT');
CREATE TYPE "QuotePhotoSource" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "QuotePhotoStatus" AS ENUM ('PENDING', 'STORED', 'FAILED');
CREATE TYPE "QuoteActivityType" AS ENUM (
  'QUOTE_SUBMITTED',
  'STATUS_CHANGED',
  'REVISION_CREATED',
  'DISCOUNT_CHANGED',
  'PRICE_CHANGED',
  'NEEDS_ATTENTION_SET',
  'NEEDS_ATTENTION_CLEARED',
  'PHOTO_ADDED',
  'PHOTO_TRANSFER_FAILED',
  'PHOTO_TRANSFER_RECOVERED'
);

CREATE TABLE "quotes" (
  "id" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
  "current_revision_number" INTEGER NOT NULL DEFAULT 1,
  "valid_until" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "accepted_by_user_id" UUID,
  "declined_at" TIMESTAMP(3),
  "declined_by_user_id" UUID,
  "customer_id" UUID,
  "property_id" UUID,
  "work_order_id" UUID,
  "recurring_agreement_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_revisions" (
  "id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "origin" "QuoteRevisionOrigin" NOT NULL,
  "structured_data" JSONB NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "subtotal_minor" INTEGER NOT NULL,
  "discount_minor" INTEGER NOT NULL DEFAULT 0,
  "discount_reason" TEXT,
  "tax_enabled" BOOLEAN NOT NULL DEFAULT false,
  "tax_minor" INTEGER NOT NULL DEFAULT 0,
  "total_minor" INTEGER NOT NULL,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_line_items" (
  "id" UUID NOT NULL,
  "quote_revision_id" UUID NOT NULL,
  "type" "QuoteLineItemType" NOT NULL,
  "code" TEXT,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount_minor" INTEGER NOT NULL,
  "line_total_minor" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_photos" (
  "id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "quote_revision_id" UUID,
  "source" "QuotePhotoSource" NOT NULL,
  "status" "QuotePhotoStatus" NOT NULL DEFAULT 'PENDING',
  "original_file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER,
  "storage_path" TEXT,
  "url" TEXT,
  "failure_reason" TEXT,
  "added_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quote_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_activities" (
  "id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "type" "QuoteActivityType" NOT NULL,
  "previous_status" "QuoteStatus",
  "new_status" "QuoteStatus",
  "note" TEXT,
  "metadata" JSONB,
  "actor_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_daily_counters" (
  "business_date" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quote_daily_counters_pkey" PRIMARY KEY ("business_date")
);

CREATE UNIQUE INDEX "quotes_reference_key" ON "quotes"("reference");
CREATE INDEX "quotes_status_idx" ON "quotes"("status");
CREATE INDEX "quotes_valid_until_idx" ON "quotes"("valid_until");
CREATE INDEX "quotes_customer_id_idx" ON "quotes"("customer_id");
CREATE INDEX "quotes_property_id_idx" ON "quotes"("property_id");
CREATE INDEX "quotes_work_order_id_idx" ON "quotes"("work_order_id");
CREATE INDEX "quotes_recurring_agreement_id_idx" ON "quotes"("recurring_agreement_id");

CREATE UNIQUE INDEX "quote_revisions_quote_id_revision_number_key" ON "quote_revisions"("quote_id", "revision_number");
CREATE INDEX "quote_revisions_quote_id_created_at_idx" ON "quote_revisions"("quote_id", "created_at");

CREATE INDEX "quote_line_items_quote_revision_id_sort_order_idx" ON "quote_line_items"("quote_revision_id", "sort_order");

CREATE INDEX "quote_photos_quote_id_created_at_idx" ON "quote_photos"("quote_id", "created_at");
CREATE INDEX "quote_photos_quote_revision_id_idx" ON "quote_photos"("quote_revision_id");
CREATE INDEX "quote_photos_status_idx" ON "quote_photos"("status");

CREATE INDEX "quote_activities_quote_id_created_at_idx" ON "quote_activities"("quote_id", "created_at");
CREATE INDEX "quote_activities_created_at_idx" ON "quote_activities"("created_at");

ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quote_id_fkey"
FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_revision_id_fkey"
FOREIGN KEY ("quote_revision_id") REFERENCES "quote_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_photos" ADD CONSTRAINT "quote_photos_quote_id_fkey"
FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_photos" ADD CONSTRAINT "quote_photos_quote_revision_id_fkey"
FOREIGN KEY ("quote_revision_id") REFERENCES "quote_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quote_activities" ADD CONSTRAINT "quote_activities_quote_id_fkey"
FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
