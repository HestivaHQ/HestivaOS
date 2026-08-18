CREATE TABLE "work_order_scope_mismatch_resolutions" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "outcome_event_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "resolution" TEXT NOT NULL,
    "customer_approval_status" TEXT NOT NULL,
    "customer_approval_method" TEXT,
    "customer_approved_at" TIMESTAMP(3),
    "proposed_amount_minor" INTEGER,
    "capacity_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "request_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_scope_mismatch_resolutions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_order_scope_mismatch_resolutions_resolution_check" CHECK ("resolution" IN ('NO_CHANGE_REQUIRED', 'NON_CHARGEABLE_ADJUSTMENT', 'CHARGEABLE_ADDITIONAL_WORK', 'DECLINE_ADDITIONAL_WORK')),
    CONSTRAINT "work_order_scope_mismatch_resolutions_approval_check" CHECK ("customer_approval_status" IN ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'DECLINED')),
    CONSTRAINT "work_order_scope_mismatch_resolutions_amount_check" CHECK ("proposed_amount_minor" IS NULL OR "proposed_amount_minor" > 0)
);

CREATE UNIQUE INDEX "work_order_scope_mismatch_resolutions_operation_id_key"
    ON "work_order_scope_mismatch_resolutions"("operation_id");
CREATE INDEX "work_order_scope_mismatch_resolutions_work_order_event_created_idx"
    ON "work_order_scope_mismatch_resolutions"("work_order_id", "outcome_event_id", "created_at");

ALTER TABLE "work_order_scope_mismatch_resolutions"
    ADD CONSTRAINT "work_order_scope_mismatch_resolutions_work_order_id_fkey"
    FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_scope_mismatch_resolutions"
    ADD CONSTRAINT "work_order_scope_mismatch_resolutions_outcome_event_id_fkey"
    FOREIGN KEY ("outcome_event_id") REFERENCES "execution_section_outcome_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_scope_mismatch_resolutions"
    ADD CONSTRAINT "work_order_scope_mismatch_resolutions_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
