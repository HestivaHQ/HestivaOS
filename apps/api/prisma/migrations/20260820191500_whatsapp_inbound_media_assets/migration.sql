CREATE TABLE "messaging_media_assets" (
  "id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_media_id" TEXT NOT NULL,
  "mime_type" TEXT,
  "file_name" TEXT,
  "provider_sha256" TEXT,
  "provider_file_size" BIGINT,
  "storage_path" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "failure_reason" TEXT,
  "stored_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messaging_media_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messaging_media_assets_status_check" CHECK ("status" IN ('PENDING', 'STORED', 'FAILED'))
);

CREATE UNIQUE INDEX "messaging_media_assets_message_provider_media_key"
  ON "messaging_media_assets"("message_id", "provider", "provider_media_id");

CREATE INDEX "messaging_media_assets_status_updated_idx"
  ON "messaging_media_assets"("status", "updated_at");

ALTER TABLE "messaging_media_assets"
  ADD CONSTRAINT "messaging_media_assets_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messaging_messages"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
