CREATE TYPE "CorrespondenceDeliveryAttemptStatus" AS ENUM ('PENDING', 'ACCEPTED', 'FAILED');

CREATE TABLE "correspondence_delivery_attempts" (
    "id" UUID NOT NULL,
    "correspondence_record_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "previous_attempt_id" UUID,
    "route_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "correspondence_delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "correspondence_delivery_attempt_events" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "status" "CorrespondenceDeliveryAttemptStatus" NOT NULL,
    "provider_reference" TEXT,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "correspondence_delivery_attempt_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "correspondence_delivery_attempts_record_number_key"
ON "correspondence_delivery_attempts"("correspondence_record_id", "attempt_number");

CREATE UNIQUE INDEX "correspondence_delivery_attempts_previous_attempt_id_key"
ON "correspondence_delivery_attempts"("previous_attempt_id");

CREATE UNIQUE INDEX "correspondence_delivery_attempts_one_root_per_record"
ON "correspondence_delivery_attempts"("correspondence_record_id")
WHERE "previous_attempt_id" IS NULL;

CREATE INDEX "correspondence_delivery_attempts_record_created_at_idx"
ON "correspondence_delivery_attempts"("correspondence_record_id", "created_at");

CREATE UNIQUE INDEX "correspondence_delivery_attempt_events_one_pending"
ON "correspondence_delivery_attempt_events"("attempt_id")
WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "correspondence_delivery_attempt_events_one_terminal"
ON "correspondence_delivery_attempt_events"("attempt_id")
WHERE "status" IN ('ACCEPTED', 'FAILED');

CREATE INDEX "correspondence_delivery_attempt_events_attempt_created_at_idx"
ON "correspondence_delivery_attempt_events"("attempt_id", "created_at");

ALTER TABLE "correspondence_delivery_attempts"
ADD CONSTRAINT "correspondence_delivery_attempts_record_fkey"
FOREIGN KEY ("correspondence_record_id") REFERENCES "correspondence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "correspondence_delivery_attempts"
ADD CONSTRAINT "correspondence_delivery_attempts_previous_attempt_fkey"
FOREIGN KEY ("previous_attempt_id") REFERENCES "correspondence_delivery_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "correspondence_delivery_attempt_events"
ADD CONSTRAINT "correspondence_delivery_attempt_events_attempt_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "correspondence_delivery_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;