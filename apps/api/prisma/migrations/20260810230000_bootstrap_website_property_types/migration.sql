-- Align the managed Property Type catalogue with HestivaHQ/hestiva src/routes/quote.tsx.
-- Matching is deliberately case/whitespace insensitive. Existing active, inactive,
-- custom, and historically-related options are never updated or removed.
DO $$
DECLARE
  approved_label TEXT;
  approved_labels TEXT[] := ARRAY['Apartment', 'Townhouse', 'House', 'Duplex', 'Other'];
BEGIN
  FOREACH approved_label IN ARRAY approved_labels LOOP
    IF EXISTS (
      SELECT 1 FROM business_list_options
      WHERE type = 'PROPERTY_TYPE'
        AND lower(trim(label)) = lower(trim(approved_label))
        AND is_active = false
    ) THEN
      RAISE NOTICE 'Canonical Property Type "%" exists but is inactive; preserving the administrator lifecycle decision.', approved_label;
    ELSIF NOT EXISTS (
      SELECT 1 FROM business_list_options
      WHERE type = 'PROPERTY_TYPE'
        AND lower(trim(label)) = lower(trim(approved_label))
    ) THEN
      INSERT INTO business_list_options
        (id, type, label, normalized_label, is_active, sort_order, created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'PROPERTY_TYPE', approved_label, lower(approved_label), true,
         array_position(approved_labels, approved_label) * 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    END IF;
  END LOOP;
END $$;
