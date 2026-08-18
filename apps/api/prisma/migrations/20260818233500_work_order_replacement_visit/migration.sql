CREATE TABLE "work_order_replacement_visits" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "interruption_id" UUID NOT NULL,
    "original_work_order_id" UUID NOT NULL,
    "replacement_work_order_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "request_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_order_replacement_visits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_order_replacement_visits_operation_id_key" ON "work_order_replacement_visits"("operation_id");
CREATE UNIQUE INDEX "work_order_replacement_visits_interruption_id_key" ON "work_order_replacement_visits"("interruption_id");
CREATE UNIQUE INDEX "work_order_replacement_visits_original_work_order_id_key" ON "work_order_replacement_visits"("original_work_order_id");
CREATE UNIQUE INDEX "work_order_replacement_visits_replacement_work_order_id_key" ON "work_order_replacement_visits"("replacement_work_order_id");

ALTER TABLE "work_order_replacement_visits" ADD CONSTRAINT "work_order_replacement_visits_interruption_id_fkey" FOREIGN KEY ("interruption_id") REFERENCES "work_order_interruptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_replacement_visits" ADD CONSTRAINT "work_order_replacement_visits_original_work_order_id_fkey" FOREIGN KEY ("original_work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_replacement_visits" ADD CONSTRAINT "work_order_replacement_visits_replacement_work_order_id_fkey" FOREIGN KEY ("replacement_work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_replacement_visits" ADD CONSTRAINT "work_order_replacement_visits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;