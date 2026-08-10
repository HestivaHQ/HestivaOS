-- Add a nullable operational profile without fabricating values for historical properties.
CREATE TYPE "BedroomCount" AS ENUM ('STUDIO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS');
CREATE TYPE "BathroomCount" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS');
CREATE TYPE "LivingAreaCount" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR_PLUS');
CREATE TYPE "StoreyCount" AS ENUM ('ONE', 'TWO', 'THREE_PLUS');

ALTER TABLE "properties"
  ADD COLUMN "bedrooms" "BedroomCount",
  ADD COLUMN "bathrooms" "BathroomCount",
  ADD COLUMN "living_areas" "LivingAreaCount",
  ADD COLUMN "storeys" "StoreyCount",
  ADD COLUMN "is_estate_or_complex" BOOLEAN,
  ADD COLUMN "requires_gate_security_access" BOOLEAN,
  ADD COLUMN "parking_notes" TEXT,
  ADD COLUMN "has_pets" BOOLEAN,
  ADD COLUMN "pet_notes" TEXT,
  ADD COLUMN "has_cameras" BOOLEAN,
  ADD COLUMN "off_limits_notes" TEXT,
  ADD COLUMN "fragile_item_notes" TEXT,
  ADD COLUMN "product_restriction_notes" TEXT,
  ADD COLUMN "allergy_notes" TEXT;
