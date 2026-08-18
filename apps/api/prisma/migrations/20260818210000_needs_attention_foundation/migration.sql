CREATE TYPE "AttentionItemType" AS ENUM (
  'TODAY_UNASSIGNED_WORK_ORDER',
  'OVERDUE_WORK_ORDER',
  'COMPLETION_ACKNOWLEDGEMENT_REQUIRED'
);

CREATE TYPE "AttentionPriority" AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "AttentionQueue" AS ENUM ('OPERATIONS', 'MANAGEMENT_REVIEW');
CREATE TYPE "AttentionState" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "AttentionActivityType" AS ENUM (
  'OPENED',
  'REOPENED',
  'SEEN',
  'ASSIGNED',
  'REASSIGNED',
  'AUTO_RESOLVED'
);

CREATE TABLE "attention_items" (
  "id" UUID NOT NULL,
  "condition_key" TEXT NOT NULL,
  "type" "AttentionItemType" NOT NULL,
  "priority" "AttentionPriority" NOT NULL,
  "queue" "AttentionQueue" NOT NULL,
  "state" "AttentionState" NOT NULL DEFAULT 'OPEN',
  "subject_type" TEXT NOT NULL,
  "subject_id" UUID NOT NULL,
  "subject_reference" TEXT,
  "customer_label" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "action_label" TEXT NOT NULL,
  "action_href" TEXT NOT NULL,
  "due_at" TIMESTAMP(3),
  "owner_id" UUID,
  "seen_at" TIMESTAMP(3),
  "seen_by_id" UUID,
  "opened_at" TIMESTAMP(3) NOT NULL,
  "last_observed_at" TIMESTAMP(3) NOT NULL,
  "resolved_at" TIMESTAMP(3),
  "occurrence_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "attention_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attention_item_activities" (
  "id" UUID NOT NULL,
  "attention_item_id" UUID NOT NULL,
  "type" "AttentionActivityType" NOT NULL,
  "actor_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "attention_item_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attention_items_condition_key_key" ON "attention_items"("condition_key");
CREATE INDEX "attention_items_state_priority_due_at_idx" ON "attention_items"("state", "priority", "due_at");
CREATE INDEX "attention_items_owner_id_state_idx" ON "attention_items"("owner_id", "state");
CREATE INDEX "attention_items_queue_state_idx" ON "attention_items"("queue", "state");
CREATE INDEX "attention_items_subject_type_subject_id_state_idx" ON "attention_items"("subject_type", "subject_id", "state");
CREATE INDEX "attention_item_activities_attention_item_id_created_at_idx" ON "attention_item_activities"("attention_item_id", "created_at");
CREATE INDEX "attention_item_activities_actor_id_created_at_idx" ON "attention_item_activities"("actor_id", "created_at");

ALTER TABLE "attention_items"
  ADD CONSTRAINT "attention_items_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attention_items"
  ADD CONSTRAINT "attention_items_seen_by_id_fkey"
  FOREIGN KEY ("seen_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attention_item_activities"
  ADD CONSTRAINT "attention_item_activities_attention_item_id_fkey"
  FOREIGN KEY ("attention_item_id") REFERENCES "attention_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attention_item_activities"
  ADD CONSTRAINT "attention_item_activities_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attention_items"
  ADD CONSTRAINT "attention_items_occurrence_count_check" CHECK ("occurrence_count" >= 1);
