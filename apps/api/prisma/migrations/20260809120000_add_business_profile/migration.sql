CREATE TABLE "business_profiles" (
  "id" TEXT NOT NULL DEFAULT 'hestiva',
  "registered_name" TEXT, "trading_name" TEXT, "registration_number" TEXT,
  "contact_number" TEXT, "business_email" TEXT, "website" TEXT, "business_address" TEXT,
  "bank_name" TEXT, "account_holder" TEXT, "account_number" TEXT, "account_type" TEXT,
  "branch_code" TEXT, "payment_instructions" TEXT, "tax_number" TEXT, "vat_number" TEXT,
  "official_identifiers" TEXT,
  "share_registered_name" BOOLEAN NOT NULL DEFAULT true, "share_trading_name" BOOLEAN NOT NULL DEFAULT true,
  "share_registration_number" BOOLEAN NOT NULL DEFAULT true, "share_contact_number" BOOLEAN NOT NULL DEFAULT true,
  "share_business_email" BOOLEAN NOT NULL DEFAULT true, "share_website" BOOLEAN NOT NULL DEFAULT true,
  "share_business_address" BOOLEAN NOT NULL DEFAULT true, "share_bank_name" BOOLEAN NOT NULL DEFAULT false,
  "share_account_holder" BOOLEAN NOT NULL DEFAULT false, "share_account_number" BOOLEAN NOT NULL DEFAULT false,
  "share_account_type" BOOLEAN NOT NULL DEFAULT false, "share_branch_code" BOOLEAN NOT NULL DEFAULT false,
  "share_payment_instructions" BOOLEAN NOT NULL DEFAULT false, "share_tax_number" BOOLEAN NOT NULL DEFAULT false,
  "share_vat_number" BOOLEAN NOT NULL DEFAULT false, "share_official_identifiers" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_profiles_singleton" CHECK ("id" = 'hestiva')
);
