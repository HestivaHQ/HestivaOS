CREATE TABLE "messaging_quote_flow_sessions" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "flow_contract_id" TEXT NOT NULL,
    "mapping_version" TEXT NOT NULL,
    "completion_contract_id" TEXT NOT NULL,
    "provider_flow_artifact_id" TEXT NOT NULL,
    "flow_json_version" TEXT NOT NULL,
    "token_fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "offered_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "launch_message_id" UUID,
    "completion_message_id" UUID,
    "provider_completion_event_key" TEXT,
    "completion_fingerprint" TEXT,
    "completion_evidence" JSONB,
    "superseded_by_id" UUID,
    "fallback_reason" TEXT,
    "fallback_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_quote_flow_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messaging_quote_flow_sessions_status_check" CHECK ("status" IN ('PREPARED','OFFERED','COMPLETED','EXPIRED','SUPERSEDED','FALLBACK')),
    CONSTRAINT "messaging_quote_flow_sessions_channel_check" CHECK ("channel" = 'WHATSAPP'),
    CONSTRAINT "messaging_quote_flow_sessions_completion_shape" CHECK (
      ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL AND "completion_message_id" IS NOT NULL AND "provider_completion_event_key" IS NOT NULL AND "completion_fingerprint" IS NOT NULL AND "completion_evidence" IS NOT NULL)
      OR
      ("status" <> 'COMPLETED' AND "completed_at" IS NULL)
    )
);

CREATE UNIQUE INDEX "messaging_quote_flow_sessions_token_fingerprint_key" ON "messaging_quote_flow_sessions"("token_fingerprint");
CREATE UNIQUE INDEX "messaging_quote_flow_sessions_launch_message_key" ON "messaging_quote_flow_sessions"("launch_message_id") WHERE "launch_message_id" IS NOT NULL;
CREATE UNIQUE INDEX "messaging_quote_flow_sessions_completion_message_key" ON "messaging_quote_flow_sessions"("completion_message_id") WHERE "completion_message_id" IS NOT NULL;
CREATE UNIQUE INDEX "messaging_quote_flow_sessions_provider_completion_key" ON "messaging_quote_flow_sessions"("provider_completion_event_key") WHERE "provider_completion_event_key" IS NOT NULL;
CREATE UNIQUE INDEX "messaging_quote_flow_sessions_one_unresolved_key" ON "messaging_quote_flow_sessions"("conversation_id", "flow_contract_id", "mapping_version") WHERE "status" IN ('PREPARED','OFFERED');
CREATE INDEX "messaging_quote_flow_sessions_conversation_status_idx" ON "messaging_quote_flow_sessions"("conversation_id", "status", "created_at");
CREATE INDEX "messaging_quote_flow_sessions_expiry_idx" ON "messaging_quote_flow_sessions"("status", "expires_at");

ALTER TABLE "messaging_quote_flow_sessions" ADD CONSTRAINT "messaging_quote_flow_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "messaging_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messaging_quote_flow_sessions" ADD CONSTRAINT "messaging_quote_flow_sessions_launch_message_id_fkey" FOREIGN KEY ("launch_message_id") REFERENCES "messaging_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messaging_quote_flow_sessions" ADD CONSTRAINT "messaging_quote_flow_sessions_completion_message_id_fkey" FOREIGN KEY ("completion_message_id") REFERENCES "messaging_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messaging_quote_flow_sessions" ADD CONSTRAINT "messaging_quote_flow_sessions_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "messaging_quote_flow_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
