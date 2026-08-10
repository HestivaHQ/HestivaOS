-- Add a nullable operational profile without fabricating values for historical properties.
-- BedroomCount and StoreyCount can already exist on clean replays because the lexically earlier
-- property-vocabulary compatibility migration must support databases where this migration ran first.
DO $$
BEGIN
  IF to_regtype('"BedroomCount"') IS NULL THEN
    CREATE TYPE "BedroomCount" AS ENUM ('STUDIO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS');
  END IF;
  IF to_regtype('"BathroomCount"') IS NULL THEN
    CREATE TYPE "BathroomCount" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS');
  END IF;
  IF to_regtype('"LivingAreaCount"') IS NULL THEN
    CREATE TYPE "LivingAreaCount" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR_PLUS');
  END IF;
  IF to_regtype('"StoreyCount"') IS NULL THEN
    CREATE TYPE "StoreyCount" AS ENUM ('ONE', 'TWO', 'THREE_PLUS');
  END IF;
END $$;

ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "bedrooms" "BedroomCount",
  ADD COLUMN IF NOT EXISTS "bathrooms" "BathroomCount",
  ADD COLUMN IF NOT EXISTS "living_areas" "LivingAreaCount",
  ADD COLUMN IF NOT EXISTS "storeys" "StoreyCount",
  ADD COLUMN IF NOT EXISTS "is_estate_or_complex" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "requires_gate_security_access" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "parking_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "has_pets" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "pet_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "has_cameras" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "off_limits_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "fragile_item_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "product_restriction_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "allergy_notes" TEXT;
