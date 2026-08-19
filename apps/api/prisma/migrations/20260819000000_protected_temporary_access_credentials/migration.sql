CREATE TYPE "TemporaryAccessCredentialReviewStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'REVOKED');
CREATE TYPE "TemporaryAccessCredentialEventType" AS ENUM ('CREATED', 'VIEWED', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED');

ALTER TABLE "work_order_temporary_access_credentials"
  ADD COLUMN "attachment_file_name" TEXT,
  ADD COLUMN "attachment_media_type" TEXT,
  ADD COLUMN "derived_metadata" JSONB,
  ADD COLUMN "review_status" "TemporaryAccessCredentialReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "request_id" UUID;

ALTER TABLE "work_order_temporary_access_credentials" DROP CONSTRAINT "work_order_temporary_access_credentials_work_order_id_fkey";
ALTER TABLE "work_order_temporary_access_credentials" ADD CONSTRAINT "work_order_temporary_access_credentials_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_temporary_access_credentials" ADD CONSTRAINT "work_order_temporary_access_credentials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "work_order_temporary_access_credentials_request_id_key" ON "work_order_temporary_access_credentials"("request_id");

CREATE TABLE "work_order_temporary_access_credential_events" (
  "id" UUID NOT NULL,
  "credential_id" UUID NOT NULL,
  "type" "TemporaryAccessCredentialEventType" NOT NULL,
  "actor_id" UUID NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_temporary_access_credential_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_temporary_access_credential_events_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "work_order_temporary_access_credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_order_temporary_access_credential_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "work_order_temporary_access_credential_events_credential_id_created_at_idx" ON "work_order_temporary_access_credential_events"("credential_id", "created_at");
CREATE INDEX "work_order_temporary_access_credential_events_actor_id_idx" ON "work_order_temporary_access_credential_events"("actor_id");
