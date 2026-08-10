-- Extend the existing managed business classifications without seeding or rewriting historical property data.
ALTER TYPE "BusinessListType" ADD VALUE 'PROPERTY_TYPE';

ALTER TABLE "properties"
ADD COLUMN "property_type_option_id" UUID;

CREATE INDEX "properties_property_type_option_id_idx"
ON "properties"("property_type_option_id");

ALTER TABLE "properties"
ADD CONSTRAINT "properties_property_type_option_id_fkey"
FOREIGN KEY ("property_type_option_id") REFERENCES "business_list_options"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
