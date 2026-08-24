ALTER TYPE "QuoteCustomerEngagementEventType" ADD VALUE 'CUSTOMER_ACCEPTED';
ALTER TYPE "QuoteCustomerEngagementEventType" ADD VALUE 'CUSTOMER_DECLINED';

CREATE TABLE "quote_customer_responses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "grant_id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "decision" "QuoteCustomerEngagementEventType" NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "event_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quote_customer_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quote_customer_responses_decision_check" CHECK ("decision" IN ('CUSTOMER_ACCEPTED', 'CUSTOMER_DECLINED')),
  CONSTRAINT "quote_customer_responses_grant_fkey" FOREIGN KEY ("grant_id") REFERENCES "quote_customer_access_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_responses_revision_fkey" FOREIGN KEY ("quote_id", "revision_number") REFERENCES "quote_revisions"("quote_id", "revision_number") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_customer_responses_event_fkey" FOREIGN KEY ("event_id") REFERENCES "quote_customer_engagement_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "quote_customer_responses_idempotency_key_key" ON "quote_customer_responses"("idempotency_key");
CREATE UNIQUE INDEX "quote_customer_responses_event_id_key" ON "quote_customer_responses"("event_id");
CREATE UNIQUE INDEX "quote_customer_responses_grant_decision_key" ON "quote_customer_responses"("grant_id", "decision");
CREATE INDEX "quote_customer_responses_quote_revision_idx" ON "quote_customer_responses"("quote_id", "revision_number", "created_at");
