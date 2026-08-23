ALTER TABLE "messaging_conversations"
  ADD COLUMN "quote_state" JSONB,
  ADD COLUMN "quote_state_version" INTEGER NOT NULL DEFAULT 0;
