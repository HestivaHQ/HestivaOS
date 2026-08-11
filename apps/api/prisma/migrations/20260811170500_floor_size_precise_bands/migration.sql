-- Add the new precise floor-size values without rewriting existing broad historical values.
-- Existing Property.floor_size rows remain unchanged because their original broad bands do not
-- contain enough information to infer a truthful narrower value.
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'UNDER_40';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_40_TO_59';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_60_TO_79';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_80_TO_99';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_100_TO_129';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_130_TO_169';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_170_TO_219';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_220_TO_299';
ALTER TYPE "FloorSize" ADD VALUE IF NOT EXISTS 'FROM_300_UP';
