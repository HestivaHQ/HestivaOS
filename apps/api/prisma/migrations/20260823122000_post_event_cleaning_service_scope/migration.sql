-- Post-Event Cleaning is an approved canonical once-off primary Service.
-- Preserve any pre-existing manually-created canonical row by normalized name.
INSERT INTO "services" (
  "id",
  "name",
  "normalized_name",
  "description",
  "type",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  '5d000001-0000-4000-8000-000000000026'::uuid,
  'Post-Event Cleaning',
  'post-event cleaning',
  'Once-off cleaning that restores a supported home or small/medium venue after an event, subject to the approved Post-Event scope and review boundaries.',
  'PRIMARY'::"ServiceType",
  'ACTIVE'::"ServiceStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "services" WHERE "normalized_name" = 'post-event cleaning'
);

-- Create one canonical operational template for the Service. The template is
-- intentionally general: accepted Quote facts decide which conditional sections
-- are applicable; field staff may record NOT_APPLICABLE for work that was not
-- included in the accepted scope.
INSERT INTO "service_scope_templates" (
  "id",
  "service_id",
  "name",
  "created_at",
  "updated_at"
)
SELECT
  '5e000001-0000-4000-8000-000000000001'::uuid,
  service."id",
  'Post-Event Cleaning v1',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "services" service
WHERE service."normalized_name" = 'post-event cleaning'
  AND NOT EXISTS (
    SELECT 1
    FROM "service_scope_templates" template
    WHERE template."service_id" = service."id"
      AND template."name" = 'Post-Event Cleaning v1'
  );

INSERT INTO "service_scope_template_versions" (
  "id",
  "template_id",
  "version",
  "status",
  "published_at",
  "created_at",
  "updated_at"
)
SELECT
  '5e000001-0000-4000-8000-000000000002'::uuid,
  template."id",
  1,
  'PUBLISHED'::"ServiceScopeTemplateVersionStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "service_scope_templates" template
JOIN "services" service ON service."id" = template."service_id"
WHERE service."normalized_name" = 'post-event cleaning'
  AND template."name" = 'Post-Event Cleaning v1'
  AND NOT EXISTS (
    SELECT 1
    FROM "service_scope_template_versions" version
    WHERE version."template_id" = template."id" AND version."version" = 1
  );

WITH target_version AS (
  SELECT version."id"
  FROM "service_scope_template_versions" version
  JOIN "service_scope_templates" template ON template."id" = version."template_id"
  JOIN "services" service ON service."id" = template."service_id"
  WHERE service."normalized_name" = 'post-event cleaning'
    AND template."name" = 'Post-Event Cleaning v1'
    AND version."version" = 1
), sections(id, stable_key, title, requirements, evidence_policy, repeat_by_property_field, sort_order) AS (
  VALUES
    (
      '5e000001-0000-4000-8000-000000000011'::uuid,
      'event-waste',
      'Event waste and loose debris',
      ARRAY[
        'Collect and bag ordinary event rubbish, bottles, cans and loose debris.',
        'Place supported bagged waste in the customer or venue designated refuse area.',
        'Do not transport bulk waste off-site unless separately authorised.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      NULL::text,
      10
    ),
    (
      '5e000001-0000-4000-8000-000000000012'::uuid,
      'surfaces-reset',
      'Surfaces, furniture and general reset',
      ARRAY[
        'Wipe accessible tables, chairs, furniture exteriors and ordinary event-used surfaces.',
        'Return movable everyday items and furniture to the agreed practical arrangement where safe.',
        'Record pre-existing damage or unsupported restoration needs as an exception rather than attempting repair.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      NULL::text,
      20
    ),
    (
      '5e000001-0000-4000-8000-000000000013'::uuid,
      'floors',
      'Floors in event-used areas',
      ARRAY[
        'Sweep or vacuum and mop applicable event-used floor areas.',
        'Treat ordinary spills/soiling within the accepted cleaning scope.',
        'Escalate specialist stain, carpet, upholstery or hazardous contamination instead of improvising treatment.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      NULL::text,
      30
    ),
    (
      '5e000001-0000-4000-8000-000000000014'::uuid,
      'bathroom',
      'Bathroom',
      ARRAY[
        'Clean and sanitise fixtures, accessible surfaces and frequently touched bathroom areas.',
        'Replenishment or consumables outside the accepted service scope are not implied.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      'bathrooms'::text,
      40
    ),
    (
      '5e000001-0000-4000-8000-000000000015'::uuid,
      'kitchen',
      'Kitchen and food-service surfaces',
      ARRAY[
        'Clean accessible kitchen work surfaces and sink areas used by the event.',
        'Complete only the dishwashing workload included in the accepted scope.',
        'Mark this section NOT_APPLICABLE when the kitchen/dishwashing was not included.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      NULL::text,
      50
    ),
    (
      '5e000001-0000-4000-8000-000000000016'::uuid,
      'living-dining',
      'Living, dining and entertainment areas',
      ARRAY[
        'Clean the ordinary living, dining and entertainment areas included in the accepted event scope.',
        'Remove ordinary food/drink debris and complete agreed surface/floor reset.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      NULL::text,
      60
    ),
    (
      '5e000001-0000-4000-8000-000000000017'::uuid,
      'outdoor-event-area',
      'Outdoor event area',
      ARRAY[
        'Clean only the patio, balcony, braai or garden entertainment areas included in the accepted scope.',
        'Mark this section NOT_APPLICABLE when no outdoor event area was included.',
        'Bulk garden, rubble or off-site waste removal is outside this checklist.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      NULL::text,
      70
    ),
    (
      '5e000001-0000-4000-8000-000000000018'::uuid,
      'final-check',
      'Final Post-Event scope check',
      ARRAY[
        'Confirm the accepted event-used areas have been reset to the agreed cleaning standard.',
        'Record any incomplete section with the correct exception reason and note.',
        'Do not silently extend work into excluded specialist, hazardous, restoration or bulk-removal scope.'
      ]::text[],
      'ON_EXCEPTION'::"ExecutionEvidencePolicy",
      NULL::text,
      80
    )
)
INSERT INTO "service_scope_template_sections" (
  "id",
  "template_version_id",
  "stable_key",
  "title",
  "requirements",
  "evidence_policy",
  "repeat_by_property_field",
  "sort_order"
)
SELECT
  sections.id,
  target_version."id",
  sections.stable_key,
  sections.title,
  sections.requirements,
  sections.evidence_policy,
  sections.repeat_by_property_field,
  sections.sort_order
FROM target_version
CROSS JOIN sections
ON CONFLICT DO NOTHING;
