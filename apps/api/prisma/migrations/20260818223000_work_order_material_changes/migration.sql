CREATE TABLE "work_order_material_changes" (
  "id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "stage" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "reason" TEXT,
  "override_reason" TEXT,
  "previous_snapshot" JSONB NOT NULL,
  "requested_changes" JSONB NOT NULL,
  "consequences" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "work_order_material_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_material_changes_operation_id_key" UNIQUE ("operation_id"),
  CONSTRAINT "work_order_material_changes_stage_check" CHECK ("stage" IN ('PENDING', 'FUTURE', 'IMMINENT'))
);

CREATE INDEX "work_order_material_changes_work_order_id_created_at_idx"
  ON "work_order_material_changes"("work_order_id", "created_at");
CREATE INDEX "work_order_material_changes_actor_id_created_at_idx"
  ON "work_order_material_changes"("actor_id", "created_at");

ALTER TABLE "work_order_material_changes"
  ADD CONSTRAINT "work_order_material_changes_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_material_changes"
  ADD CONSTRAINT "work_order_material_changes_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
