CREATE TYPE "ServiceType" AS ENUM ('PRIMARY', 'ADD_ON');

ALTER TABLE "services"
ADD COLUMN "normalized_name" TEXT,
ADD COLUMN "type" "ServiceType" NOT NULL DEFAULT 'PRIMARY';

-- Reconcile the one approved alias without replacing its operational identity.
UPDATE "services" legacy
SET "name" = 'Eco-Conscious Cleaning',
    "normalized_name" = 'eco-conscious cleaning',
    "updated_at" = CURRENT_TIMESTAMP
WHERE lower(btrim(legacy."name")) = 'eco-friendly cleaning'
  AND NOT EXISTS (
    SELECT 1 FROM "services" canonical
    WHERE lower(btrim(canonical."name")) = 'eco-conscious cleaning'
  );

-- Give unambiguous existing matches their canonical key and classification. Rows
-- with ambiguous case/whitespace duplicates remain untouched for manual review.
WITH catalogue(name, normalized_name, type) AS (
  VALUES
    ('Regular Home Cleaning', 'regular home cleaning', 'PRIMARY'::"ServiceType"),
    ('Deep Cleaning', 'deep cleaning', 'PRIMARY'::"ServiceType"),
    ('Move-In Cleaning', 'move-in cleaning', 'PRIMARY'::"ServiceType"),
    ('Move-Out Cleaning', 'move-out cleaning', 'PRIMARY'::"ServiceType"),
    ('Kitchen Cleaning', 'kitchen cleaning', 'PRIMARY'::"ServiceType"),
    ('Bathroom Sanitisation', 'bathroom sanitisation', 'PRIMARY'::"ServiceType"),
    ('Bedroom Cleaning', 'bedroom cleaning', 'PRIMARY'::"ServiceType"),
    ('Living Area Cleaning', 'living area cleaning', 'PRIMARY'::"ServiceType"),
    ('Interior Window Cleaning', 'interior window cleaning', 'PRIMARY'::"ServiceType"),
    ('Apartment Cleaning', 'apartment cleaning', 'PRIMARY'::"ServiceType"),
    ('Eco-Conscious Cleaning', 'eco-conscious cleaning', 'PRIMARY'::"ServiceType"),
    ('Laundry Folding', 'laundry folding', 'ADD_ON'::"ServiceType"),
    ('Inside Fridge Cleaning', 'inside fridge cleaning', 'ADD_ON'::"ServiceType"),
    ('Inside Oven Cleaning', 'inside oven cleaning', 'ADD_ON'::"ServiceType"),
    ('Interior Cupboard Cleaning', 'interior cupboard cleaning', 'ADD_ON'::"ServiceType"),
    ('Extra Laundry Folding', 'extra laundry folding', 'ADD_ON'::"ServiceType"),
    ('Balcony Sweeping', 'balcony sweeping', 'ADD_ON'::"ServiceType"),
    ('Additional Room Cleaning', 'additional room cleaning', 'ADD_ON'::"ServiceType")
), unique_matches AS (
  SELECT catalogue.name, catalogue.normalized_name, catalogue.type
  FROM catalogue
  JOIN "services" ON lower(btrim("services"."name")) = catalogue.normalized_name
  GROUP BY catalogue.name, catalogue.normalized_name, catalogue.type
  HAVING count(*) = 1
)
UPDATE "services"
SET "name" = unique_matches.name,
    "normalized_name" = unique_matches.normalized_name,
    "type" = unique_matches.type
FROM unique_matches
WHERE lower(btrim("services"."name")) = unique_matches.normalized_name;

-- Create only missing approved records. Fixed UUIDs make the intended records
-- stable while name reconciliation preserves every pre-existing Service ID.
WITH catalogue(id, name, normalized_name, description, type) AS (
  VALUES
    ('5d000001-0000-4000-8000-000000000001'::uuid, 'Regular Home Cleaning', 'regular home cleaning', 'Routine residential cleaning for lived-in homes that need consistent care and attention to everyday surfaces.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000002'::uuid, 'Deep Cleaning', 'deep cleaning', 'A more detailed residential clean for homes that need additional time, focused attention and broader surface cleaning.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000003'::uuid, 'Move-In Cleaning', 'move-in cleaning', 'Residential cleaning for an empty or mostly empty home before occupants settle in.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000004'::uuid, 'Move-Out Cleaning', 'move-out cleaning', 'Residential cleaning for a vacated home, based on the property condition and the agreed handover scope.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000005'::uuid, 'Kitchen Cleaning', 'kitchen cleaning', 'Focused cleaning for the kitchen’s everyday surfaces, fittings and selected appliance interiors.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000006'::uuid, 'Bathroom Sanitisation', 'bathroom sanitisation', 'Focused residential bathroom cleaning for fixtures, surfaces and frequently touched areas.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000007'::uuid, 'Bedroom Cleaning', 'bedroom cleaning', 'Careful cleaning of bedrooms and their accessible everyday surfaces.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000008'::uuid, 'Living Area Cleaning', 'living area cleaning', 'Residential cleaning for lounges, dining areas and other shared living spaces.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000009'::uuid, 'Interior Window Cleaning', 'interior window cleaning', 'Interior glass cleaning for safely reachable windows, mirrors and selected glass surfaces.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000010'::uuid, 'Apartment Cleaning', 'apartment cleaning', 'Residential cleaning shaped for apartments, flats and compact homes.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000011'::uuid, 'Eco-Conscious Cleaning', 'eco-conscious cleaning', 'A cleaning option that considers product choice and practical household preferences where suitable products are available.', 'PRIMARY'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000012'::uuid, 'Laundry Folding', 'laundry folding', 'An optional household add-on for neatly folding clean, dry laundry supplied by the customer.', 'ADD_ON'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000013'::uuid, 'Inside Fridge Cleaning', 'inside fridge cleaning', NULL, 'ADD_ON'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000014'::uuid, 'Inside Oven Cleaning', 'inside oven cleaning', NULL, 'ADD_ON'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000015'::uuid, 'Interior Cupboard Cleaning', 'interior cupboard cleaning', NULL, 'ADD_ON'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000016'::uuid, 'Extra Laundry Folding', 'extra laundry folding', NULL, 'ADD_ON'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000017'::uuid, 'Balcony Sweeping', 'balcony sweeping', NULL, 'ADD_ON'::"ServiceType"),
    ('5d000001-0000-4000-8000-000000000018'::uuid, 'Additional Room Cleaning', 'additional room cleaning', NULL, 'ADD_ON'::"ServiceType")
)
INSERT INTO "services" ("id", "name", "normalized_name", "description", "status", "type", "created_at", "updated_at")
SELECT id, name, normalized_name, description, 'ACTIVE'::"ServiceStatus", type, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM catalogue
WHERE NOT EXISTS (
  SELECT 1 FROM "services"
  WHERE lower(btrim("services"."name")) = catalogue.normalized_name
     OR (catalogue.normalized_name = 'eco-conscious cleaning' AND lower(btrim("services"."name")) = 'eco-friendly cleaning')
);

CREATE UNIQUE INDEX "services_normalized_name_key" ON "services"("normalized_name");
CREATE INDEX "services_type_idx" ON "services"("type");
