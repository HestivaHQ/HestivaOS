CREATE TYPE "MessagingChannel" AS ENUM ('WHATSAPP', 'MESSENGER');
CREATE TYPE "MessagingDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "MessagingMessageKind" AS ENUM ('TEXT', 'INTERACTIVE', 'MEDIA', 'SYSTEM', 'UNSUPPORTED');
CREATE TYPE "MessagingDeliveryStatus" AS ENUM ('RECEIVED', 'PENDING', 'ACCEPTED', 'FAILED');
CREATE TYPE "MessagingMessagePurpose" AS ENUM ('GENERAL', 'WORK_ORDER_ACCESS_RECOVERY');
CREATE TYPE "WorkOrderAccessRecoveryStatus" AS ENUM ('PENDING_SEND', 'SENT', 'SEND_FAILED', 'RESPONSE_REQUIRES_REVIEW', 'CLOSED');

CREATE TABLE "messaging_conversations" (
  "id" UUID NOT NULL, "channel" "MessagingChannel" NOT NULL, "provider" TEXT NOT NULL,
  "provider_conversation_id" TEXT, "provider_identity_id" TEXT NOT NULL, "customer_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messaging_conversations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "messaging_messages" (
  "id" UUID NOT NULL, "conversation_id" UUID NOT NULL, "direction" "MessagingDirection" NOT NULL,
  "kind" "MessagingMessageKind" NOT NULL, "purpose" "MessagingMessagePurpose" NOT NULL DEFAULT 'GENERAL',
  "provider_event_key" TEXT, "idempotency_key" TEXT, "content_text" TEXT,
  "attachment_metadata" JSONB, "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messaging_messages_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "messaging_message_status_events" (
  "id" UUID NOT NULL, "message_id" UUID NOT NULL, "status" "MessagingDeliveryStatus" NOT NULL,
  "provider_message_id" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messaging_message_status_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "work_order_access_recoveries" (
  "id" UUID NOT NULL, "work_order_id" UUID NOT NULL, "conversation_id" UUID NOT NULL,
  "outbound_message_id" UUID NOT NULL, "response_message_id" UUID, "initiated_by_id" UUID NOT NULL,
  "request_id" UUID NOT NULL, "access_readiness_at_request" "WorkOrderAccessReadiness" NOT NULL,
  "work_order_updated_at_at_request" TIMESTAMP(3) NOT NULL, "status" "WorkOrderAccessRecoveryStatus" NOT NULL DEFAULT 'PENDING_SEND',
  "sent_at" TIMESTAMP(3), "closed_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "work_order_access_recoveries_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "work_order_temporary_access_credentials" ADD COLUMN "source_message_id" UUID;
CREATE UNIQUE INDEX "messaging_conversations_channel_provider_provider_identity_id_key" ON "messaging_conversations"("channel", "provider", "provider_identity_id");
CREATE INDEX "messaging_conversations_customer_id_channel_idx" ON "messaging_conversations"("customer_id", "channel");
CREATE UNIQUE INDEX "messaging_messages_provider_event_key_key" ON "messaging_messages"("provider_event_key");
CREATE UNIQUE INDEX "messaging_messages_idempotency_key_key" ON "messaging_messages"("idempotency_key");
CREATE INDEX "messaging_messages_conversation_id_occurred_at_idx" ON "messaging_messages"("conversation_id", "occurred_at");
CREATE INDEX "messaging_message_status_events_message_id_created_at_idx" ON "messaging_message_status_events"("message_id", "created_at");
CREATE UNIQUE INDEX "work_order_access_recoveries_outbound_message_id_key" ON "work_order_access_recoveries"("outbound_message_id");
CREATE UNIQUE INDEX "work_order_access_recoveries_response_message_id_key" ON "work_order_access_recoveries"("response_message_id");
CREATE UNIQUE INDEX "work_order_access_recoveries_request_id_key" ON "work_order_access_recoveries"("request_id");
CREATE INDEX "work_order_access_recoveries_work_order_id_created_at_idx" ON "work_order_access_recoveries"("work_order_id", "created_at");
CREATE INDEX "work_order_access_recoveries_conversation_id_status_idx" ON "work_order_access_recoveries"("conversation_id", "status");
CREATE UNIQUE INDEX "work_order_temporary_access_credentials_source_message_id_key" ON "work_order_temporary_access_credentials"("source_message_id");
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "messaging_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messaging_message_status_events" ADD CONSTRAINT "messaging_message_status_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messaging_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_access_recoveries" ADD CONSTRAINT "work_order_access_recoveries_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_access_recoveries" ADD CONSTRAINT "work_order_access_recoveries_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "messaging_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_access_recoveries" ADD CONSTRAINT "work_order_access_recoveries_outbound_message_id_fkey" FOREIGN KEY ("outbound_message_id") REFERENCES "messaging_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_access_recoveries" ADD CONSTRAINT "work_order_access_recoveries_response_message_id_fkey" FOREIGN KEY ("response_message_id") REFERENCES "messaging_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_access_recoveries" ADD CONSTRAINT "work_order_access_recoveries_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_temporary_access_credentials" ADD CONSTRAINT "work_order_temporary_access_credentials_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "messaging_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
