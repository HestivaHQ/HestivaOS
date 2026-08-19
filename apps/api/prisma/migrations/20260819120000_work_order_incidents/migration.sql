CREATE TYPE "WorkOrderIncidentCategory" AS ENUM ('SAFETY_CRITICAL_STOP','PROPERTY_OR_ITEM_DAMAGE','CUSTOMER_OR_PROPERTY_CONDITION','OPERATIONAL_INCIDENT');
CREATE TYPE "WorkOrderIncidentStatus" AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED');
CREATE TYPE "WorkOrderIncidentResolution" AS ENUM ('NO_FURTHER_OPERATIONAL_ACTION','FOLLOW_UP_COMPLETED','ESCALATED_OUTSIDE_WORKFLOW');
CREATE TYPE "WorkOrderIncidentReviewAction" AS ENUM ('ACKNOWLEDGE','RESOLVE','REOPEN');
ALTER TYPE "ExecutionEvidencePurpose" ADD VALUE 'INCIDENT_EVIDENCE';
ALTER TYPE "AttentionItemType" ADD VALUE 'WORK_ORDER_INCIDENT_REVIEW_REQUIRED';
CREATE TABLE "work_order_incidents" (
 "id" UUID NOT NULL,"operation_id" UUID NOT NULL,"request_hash" TEXT NOT NULL,"work_order_id" UUID NOT NULL,"technician_id" UUID NOT NULL,"job_leader_id" UUID,"section_id" UUID,"category" "WorkOrderIncidentCategory" NOT NULL,"note" TEXT NOT NULL,"field_reported_at" TIMESTAMP(3) NOT NULL,"status" "WorkOrderIncidentStatus" NOT NULL DEFAULT 'OPEN',"resolved_at" TIMESTAMP(3),"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "work_order_incidents_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "work_order_incident_reviews" (
 "id" UUID NOT NULL,"operation_id" UUID NOT NULL,"request_hash" TEXT NOT NULL,"incident_id" UUID NOT NULL,"actor_id" UUID NOT NULL,"action" "WorkOrderIncidentReviewAction" NOT NULL,"resolution" "WorkOrderIncidentResolution","note" TEXT,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "work_order_incident_reviews_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "execution_section_evidence" ADD COLUMN "incident_id" UUID;
CREATE UNIQUE INDEX "work_order_incidents_operation_id_key" ON "work_order_incidents"("operation_id");
CREATE INDEX "work_order_incidents_work_order_id_status_created_at_idx" ON "work_order_incidents"("work_order_id","status","created_at");
CREATE INDEX "work_order_incidents_technician_id_created_at_idx" ON "work_order_incidents"("technician_id","created_at");
CREATE UNIQUE INDEX "work_order_incident_reviews_operation_id_key" ON "work_order_incident_reviews"("operation_id");
CREATE INDEX "work_order_incident_reviews_incident_id_created_at_idx" ON "work_order_incident_reviews"("incident_id","created_at");
ALTER TABLE "work_order_incidents" ADD CONSTRAINT "work_order_incidents_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_incidents" ADD CONSTRAINT "work_order_incidents_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_incidents" ADD CONSTRAINT "work_order_incidents_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "work_order_execution_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_incident_reviews" ADD CONSTRAINT "work_order_incident_reviews_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "work_order_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_incident_reviews" ADD CONSTRAINT "work_order_incident_reviews_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "execution_section_evidence" ADD CONSTRAINT "execution_section_evidence_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "work_order_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
