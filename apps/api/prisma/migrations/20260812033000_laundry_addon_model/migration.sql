-- Preserve the historical Laundry Folding Service identity and any relationships,
-- but stop offering it for new bookings. Do not rewrite historical Work Orders.
UPDATE "services"
SET "status" = 'INACTIVE'::"ServiceStatus", "updated_at" = CURRENT_TIMESTAMP
WHERE "normalized_name" = 'laundry folding';

-- New bookings use one canonical Laundry add-on capability. The operational
-- outcome (Wash, Dry & Fold vs Wash & Hang) is determined by facilities and
-- stored/priced by the quote/work-order workflow rather than by duplicate
-- Service identities.
INSERT INTO "services" (
  "id",
  "name",
  "normalized_name",
  "description",
  "type",
  "status",
  "created_at",
  "updated_at"
) VALUES (
  '5d000001-0000-4000-8000-000000000025',
  'Laundry',
  'laundry',
  'On-site laundry add-on for qualifying whole-home cleaning bookings; outcome depends on customer laundry facilities.',
  'ADD_ON'::"ServiceType",
  'ACTIVE'::"ServiceStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;
