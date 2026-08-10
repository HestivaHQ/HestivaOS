-- BOTH was committed by the preceding migration and is now safe to use.
UPDATE "services"
SET "type" = 'BOTH'::"ServiceType", "updated_at" = CURRENT_TIMESTAMP
WHERE "normalized_name" IN ('interior window cleaning', 'laundry folding');

-- Current website add-ons with verified distinct operational capability.
-- Existing/custom/inactive rows and canonical IDs win; aliases are not inserted.
INSERT INTO "services" ("id", "name", "normalized_name", "description", "type", "status", "created_at", "updated_at") VALUES
  ('5d000001-0000-4000-8000-000000000019', 'Linen Change', 'linen change', 'Change supplied bed linen during the selected primary service.', 'ADD_ON', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('5d000001-0000-4000-8000-000000000020', 'Bed Making', 'bed making', 'Make beds without a linen change during the selected primary service.', 'ADD_ON', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('5d000001-0000-4000-8000-000000000021', 'Garage Sweeping', 'garage sweeping', 'Sweep the accessible garage floor during the selected primary service.', 'ADD_ON', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('5d000001-0000-4000-8000-000000000022', 'Ironing', 'ironing', 'Iron suitable customer garments during the selected primary service.', 'ADD_ON', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('5d000001-0000-4000-8000-000000000023', 'Extra Bathroom Cleaning', 'extra bathroom cleaning', 'Clean one additional bathroom beyond the selected service baseline.', 'ADD_ON', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('5d000001-0000-4000-8000-000000000024', 'Pet-Hair Treatment', 'pet-hair treatment', 'Provide additional pet-hair removal treatment during the selected primary service.', 'ADD_ON', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
