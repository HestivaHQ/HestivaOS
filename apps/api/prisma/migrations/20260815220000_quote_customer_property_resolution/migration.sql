CREATE TYPE "QuoteEntityResolution" AS ENUM ('USE_EXISTING', 'CREATE_NEW');

ALTER TYPE "QuoteActivityType" ADD VALUE 'MATCH_RESOLUTION_RECORDED';

ALTER TABLE "quotes"
  ADD COLUMN "customer_resolution" "QuoteEntityResolution",
  ADD COLUMN "property_resolution" "QuoteEntityResolution",
  ADD COLUMN "resolution_revision_number" INTEGER;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_resolution_consistency" CHECK (
  ("customer_resolution" = 'USE_EXISTING' AND "customer_id" IS NOT NULL)
  OR ("customer_resolution" = 'CREATE_NEW' AND "customer_id" IS NULL)
  OR "customer_resolution" IS NULL
);

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_property_resolution_consistency" CHECK (
  ("property_resolution" = 'USE_EXISTING' AND "property_id" IS NOT NULL)
  OR ("property_resolution" = 'CREATE_NEW' AND "property_id" IS NULL)
  OR "property_resolution" IS NULL
);
