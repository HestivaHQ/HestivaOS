-- Additive compatibility migration: legacy estate boolean and THREE_PLUS remain intact.
CREATE TYPE "FloorSize" AS ENUM ('UNDER_80', 'FROM_80_TO_150', 'FROM_151_TO_250', 'OVER_250', 'UNKNOWN');
CREATE TYPE "OutdoorArea" AS ENUM ('NONE', 'BALCONY', 'PATIO', 'BOTH');
CREATE TYPE "EstateClassification" AS ENUM ('NONE', 'ESTATE', 'COMPLEX', 'GATED_COMMUNITY');
CREATE TYPE "UnitFloor" AS ENUM ('GROUND', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH_TO_NINTH', 'TENTH_PLUS', 'THIRD_PLUS', 'UNKNOWN');
ALTER TYPE "BedroomCount" ADD VALUE 'OTHER';
ALTER TYPE "StoreyCount" ADD VALUE 'THREE';
ALTER TYPE "StoreyCount" ADD VALUE 'FOUR_PLUS';
ALTER TYPE "StoreyCount" ADD VALUE 'UNKNOWN';
ALTER TABLE "properties" ADD COLUMN "floor_size" "FloorSize", ADD COLUMN "outdoor_area" "OutdoorArea", ADD COLUMN "estate_classification" "EstateClassification", ADD COLUMN "unit_floor" "UnitFloor";
