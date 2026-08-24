ALTER TYPE "QuoteActivityType" ADD VALUE IF NOT EXISTS 'WHATSAPP_COMPOSER_OPENED';

CREATE TABLE "correspondence_provider_events" (
  "id" UUID NOT NULL,
  "attempt_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_event_id" TEXT NOT NULL,
  "provider_reference" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "correspondence_provider_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "correspondence_provider_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "correspondence_delivery_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "correspondence_provider_events_provider_event_id_key" ON "correspondence_provider_events"("provider_event_id");
CREATE INDEX "correspondence_provider_events_attempt_id_occurred_at_idx" ON "correspondence_provider_events"("attempt_id", "occurred_at");
CREATE INDEX "correspondence_provider_events_provider_reference_idx" ON "correspondence_provider_events"("provider", "provider_reference");

INSERT INTO "correspondence_templates" ("id", "key", "name", "created_at", "updated_at")
VALUES ('8d8ae82e-91fe-4ceb-a121-1f784dbca7e1'::uuid, 'quote_customer_ready_v1', 'Quote ready email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "correspondence_template_versions" (
  "id", "template_id", "version", "status", "subject", "body", "published_at", "created_at", "updated_at"
)
SELECT
  '743e5d70-1697-4c61-aa70-2e4e65c4ef85'::uuid,
  t."id",
  1,
  'PUBLISHED'::"CorrespondenceTemplateVersionStatus",
  'Your Homent Quote is ready',
  E'Hello,\n\nYour Homent Quote is ready to review.\n\nReview your secure Quote: {{SECURE_QUOTE_LINK}}\n\nThis private link is for the exact Quote revision sent to you.\n\nRegards,\nHoment Quotes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "correspondence_templates" t
WHERE t."key" = 'quote_customer_ready_v1'
  AND NOT EXISTS (
    SELECT 1 FROM "correspondence_template_versions" v
    WHERE v."template_id" = t."id" AND v."version" = 1
  );
