CREATE TYPE "MessagingConversationControlState" AS ENUM ('AUTOMATION', 'HUMAN_TAKEOVER');
CREATE TYPE "MessagingConversationControlAction" AS ENUM ('TAKE_OVER', 'RETURN_TO_AUTOMATION');

ALTER TABLE "messaging_conversations"
  ADD COLUMN "control_state" "MessagingConversationControlState" NOT NULL DEFAULT 'AUTOMATION',
  ADD COLUMN "control_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "messaging_conversation_control_events" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "action" "MessagingConversationControlAction" NOT NULL,
  "previous_state" "MessagingConversationControlState" NOT NULL,
  "resulting_state" "MessagingConversationControlState" NOT NULL,
  "resulting_version" INTEGER NOT NULL,
  "actor_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messaging_conversation_control_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messaging_conversation_control_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "messaging_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "messaging_conversation_control_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "messaging_conversation_control_events_request_id_key" ON "messaging_conversation_control_events"("request_id");
CREATE INDEX "messaging_conversation_control_events_conversation_id_created_at_idx" ON "messaging_conversation_control_events"("conversation_id", "created_at");
CREATE INDEX "messaging_conversation_control_events_actor_id_created_at_idx" ON "messaging_conversation_control_events"("actor_id", "created_at");
