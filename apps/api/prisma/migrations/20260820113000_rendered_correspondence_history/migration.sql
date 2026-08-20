CREATE TABLE "correspondence_records" (
    "id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "template_key_snapshot" TEXT NOT NULL,
    "template_version_number" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "recipient_snapshot" JSONB NOT NULL,
    "provenance" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correspondence_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "correspondence_records_template_version_id_created_at_idx"
ON "correspondence_records"("template_version_id", "created_at");

CREATE INDEX "correspondence_records_created_at_idx"
ON "correspondence_records"("created_at");

ALTER TABLE "correspondence_records"
ADD CONSTRAINT "correspondence_records_template_version_id_fkey"
FOREIGN KEY ("template_version_id") REFERENCES "correspondence_template_versions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;