CREATE TABLE "messaging_provider_status_events" (
  "id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_message_id" TEXT NOT NULL,
  "provider_status" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messaging_provider_status_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "msg_provider_status_event_dedupe_key"
  ON "messaging_provider_status_events"("provider", "provider_message_id", "provider_status", "occurred_at");

CREATE INDEX "messaging_provider_status_events_message_id_occurred_at_idx"
  ON "messaging_provider_status_events"("message_id", "occurred_at");

ALTER TABLE "messaging_provider_status_events"
  ADD CONSTRAINT "messaging_provider_status_events_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messaging_messages"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
