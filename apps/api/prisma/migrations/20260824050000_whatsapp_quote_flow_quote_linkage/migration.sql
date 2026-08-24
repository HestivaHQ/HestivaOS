ALTER TABLE "messaging_quote_flow_sessions"
  ADD COLUMN "submission_key" TEXT,
  ADD COLUMN "submitted_quote_id" UUID,
  ADD COLUMN "human_review_reason" TEXT,
  ADD COLUMN "processed_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "messaging_quote_flow_sessions_submission_key_key"
  ON "messaging_quote_flow_sessions"("submission_key")
  WHERE "submission_key" IS NOT NULL;

CREATE UNIQUE INDEX "messaging_quote_flow_sessions_submitted_quote_id_key"
  ON "messaging_quote_flow_sessions"("submitted_quote_id")
  WHERE "submitted_quote_id" IS NOT NULL;

ALTER TABLE "messaging_quote_flow_sessions"
  ADD CONSTRAINT "messaging_quote_flow_sessions_submitted_quote_id_fkey"
  FOREIGN KEY ("submitted_quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
