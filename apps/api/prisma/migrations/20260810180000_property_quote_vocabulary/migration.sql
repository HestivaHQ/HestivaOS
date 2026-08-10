-- Additive compatibility migration: legacy estate boolean and THREE_PLUS remain intact.
CREATE TYPE "FloorSize" AS ENUM ('UNDER_80', 'FROM_80_TO_150', 'FROM_151_TO_250', 'OVER_250', 'UNKNOWN');
CREATE TYPE "OutdoorArea" AS ENUM ('NONE', 'BALCONY', 'PATIO', 'BOTH');
CREATE TYPE "EstateClassification" AS ENUM ('NONE', 'ESTATE', 'COMPLEX', 'GATED_COMMUNITY');
CREATE TYPE "UnitFloor" AS ENUM ('GROUND', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH_TO_NINTH', 'TENTH_PLUS', 'THIRD_PLUS', 'UNKNOWN');

-- This migration sorts before the historical operational-profile migration that originally
-- introduced these types. Existing databases already have the base types; clean replays do not.
DO $$
BEGIN
  IF to_regtype('"BedroomCount"') IS NULL THEN
    CREATE TYPE "BedroomCount" AS ENUM ('STUDIO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS', 'OTHER');
  ELSE
    ALTER TYPE "BedroomCount" ADD VALUE IF NOT EXISTS 'OTHER';
  END IF;

  IF to_regtype('"StoreyCount"') IS NULL THEN
    CREATE TYPE "StoreyCount" AS ENUM ('ONE', 'TWO', 'THREE_PLUS', 'THREE', 'FOUR_PLUS', 'UNKNOWN');
  ELSE
    ALTER TYPE "StoreyCount" ADD VALUE IF NOT EXISTS 'THREE';
    ALTER TYPE "StoreyCount" ADD VALUE IF NOT EXISTS 'FOUR_PLUS';
    ALTER TYPE "StoreyCount" ADD VALUE IF NOT EXISTS 'UNKNOWN';
  END IF;
END $$;

ALTER TABLE "properties" ADD COLUMN "floor_size" "FloorSize", ADD COLUMN "outdoor_area" "OutdoorArea", ADD COLUMN "estate_classification" "EstateClassification", ADD COLUMN "unit_floor" "UnitFloor";
