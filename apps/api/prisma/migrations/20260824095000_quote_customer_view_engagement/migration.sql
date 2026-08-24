CREATE TYPE "QuoteCustomerEngagementEventType" AS ENUM ('VIEW_CONFIRMED');

CREATE TABLE "quote_customer_view_challenges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "grant_id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "challenge_fingerprint" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "confirmed_at" TIMESTAMP(3),
  "event_id" UUID,

  CONSTRAINT "quote_customer_view_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quote_customer_view_challenges_grant_fkey"
    FOREIGN KEY ("grant_id") REFERENCES "quote_customer_access_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_view_challenges_revision_fkey"
    FOREIGN KEY ("quote_id", "revision_number") REFERENCES "quote_revisions"("quote_id", "revision_number") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_view_challenges_confirmation_shape_check" CHECK (
    ("confirmed_at" IS NULL) = ("event_id" IS NULL)
  )
);

CREATE UNIQUE INDEX "quote_customer_view_challenges_fingerprint_key"
  ON "quote_customer_view_challenges"("challenge_fingerprint");
CREATE UNIQUE INDEX "quote_customer_view_challenges_event_id_key"
  ON "quote_customer_view_challenges"("event_id")
  WHERE "event_id" IS NOT NULL;
CREATE INDEX "quote_customer_view_challenges_grant_expiry_idx"
  ON "quote_customer_view_challenges"("grant_id", "expires_at");

CREATE TABLE "quote_customer_engagement_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "grant_id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "event_type" "QuoteCustomerEngagementEventType" NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quote_customer_engagement_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quote_customer_engagement_events_grant_fkey"
    FOREIGN KEY ("grant_id") REFERENCES "quote_customer_access_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_engagement_events_revision_fkey"
    FOREIGN KEY ("quote_id", "revision_number") REFERENCES "quote_revisions"("quote_id", "revision_number") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "quote_customer_engagement_events_idempotency_key_key"
  ON "quote_customer_engagement_events"("idempotency_key");
CREATE INDEX "quote_customer_engagement_events_quote_revision_time_idx"
  ON "quote_customer_engagement_events"("quote_id", "revision_number", "event_type", "occurred_at");
CREATE INDEX "quote_customer_engagement_events_grant_time_idx"
  ON "quote_customer_engagement_events"("grant_id", "event_type", "occurred_at");

ALTER TABLE "quote_customer_view_challenges"
  ADD CONSTRAINT "quote_customer_view_challenges_event_fkey"
  FOREIGN KEY ("event_id") REFERENCES "quote_customer_engagement_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
