ALTER TYPE "WorkOrderStatus" ADD VALUE 'INTERRUPTED';
ALTER TYPE "AttentionItemType" ADD VALUE 'INTERRUPTED_VISIT_REVIEW_REQUIRED';

CREATE TABLE "work_order_interruptions" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "scope_revision_id" UUID NOT NULL,
    "field_interrupted_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "server_accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_order_interruptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_order_interruptions_reason_check" CHECK ("reason" IN ('NO_ACCESS','UTILITIES_UNAVAILABLE','SAFETY_CONCERN','CUSTOMER_REQUESTED','REQUIRED_RESOURCE_UNAVAILABLE','OTHER'))
);
CREATE UNIQUE INDEX "work_order_interruptions_operation_id_key" ON "work_order_interruptions"("operation_id");
CREATE UNIQUE INDEX "work_order_interruptions_work_order_id_key" ON "work_order_interruptions"("work_order_id");
ALTER TABLE "work_order_interruptions" ADD CONSTRAINT "work_order_interruptions_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_interruptions" ADD CONSTRAINT "work_order_interruptions_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_interruptions" ADD CONSTRAINT "work_order_interruptions_scope_revision_id_fkey" FOREIGN KEY ("scope_revision_id") REFERENCES "work_order_execution_scope_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "work_order_interruption_routes" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "interruption_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "next_action" TEXT NOT NULL,
    "note" TEXT,
    "request_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_order_interruption_routes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_order_interruption_routes_action_check" CHECK ("next_action" IN ('REPLACEMENT_VISIT','FOLLOW_UP','PARTIAL_COMPLETION_REVIEW','FINANCIAL_REVIEW','CLOSE'))
);
CREATE UNIQUE INDEX "work_order_interruption_routes_operation_id_key" ON "work_order_interruption_routes"("operation_id");
CREATE INDEX "work_order_interruption_routes_interruption_created_idx" ON "work_order_interruption_routes"("interruption_id","created_at");
ALTER TABLE "work_order_interruption_routes" ADD CONSTRAINT "work_order_interruption_routes_interruption_id_fkey" FOREIGN KEY ("interruption_id") REFERENCES "work_order_interruptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_interruption_routes" ADD CONSTRAINT "work_order_interruption_routes_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
