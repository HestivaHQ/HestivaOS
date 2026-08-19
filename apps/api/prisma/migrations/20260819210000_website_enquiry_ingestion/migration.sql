CREATE TABLE "enquiry_daily_counters" (
  "business_date" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enquiry_daily_counters_pkey" PRIMARY KEY ("business_date")
);

CREATE TABLE "website_enquiries" (
  "id" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "submission_key" TEXT NOT NULL,
  "payload_fingerprint" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "enquiry_type" TEXT NOT NULL,
  "property_address" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "preferred_contact" TEXT NOT NULL,
  "structured_data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "website_enquiries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_enquiries_reference_key" ON "website_enquiries"("reference");
CREATE UNIQUE INDEX "website_enquiries_submission_key_key" ON "website_enquiries"("submission_key");
CREATE INDEX "website_enquiries_submitted_at_idx" ON "website_enquiries"("submitted_at");
CREATE INDEX "website_enquiries_email_idx" ON "website_enquiries"("email");
