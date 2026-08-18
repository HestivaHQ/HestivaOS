CREATE TYPE "ExecutionEvidencePurpose" AS ENUM ('REQUIRED_SECTION_EVIDENCE', 'EXCEPTION_EVIDENCE');

ALTER TABLE "execution_section_evidence"
  ALTER COLUMN "local_evidence_id" TYPE UUID USING "local_evidence_id"::uuid,
  ADD COLUMN "work_order_id" UUID,
  ADD COLUMN "scope_revision_id" UUID,
  ADD COLUMN "technician_id" UUID,
  ADD COLUMN "purpose" "ExecutionEvidencePurpose",
  ADD COLUMN "storage_path" TEXT;

-- B2/C rows were transport placeholders attached to an outcome; derive their immutable context.
UPDATE "execution_section_evidence" evidence
SET "scope_revision_id" = section."scope_revision_id",
    "work_order_id" = revision."work_order_id",
    "technician_id" = outcome."technician_id",
    "purpose" = CASE WHEN outcome."outcome" = 'NOT_COMPLETED' THEN 'EXCEPTION_EVIDENCE'::"ExecutionEvidencePurpose" ELSE 'REQUIRED_SECTION_EVIDENCE'::"ExecutionEvidencePurpose" END
FROM "work_order_execution_sections" section,
     "work_order_execution_scope_revisions" revision,
     "execution_section_outcome_events" outcome
WHERE evidence."section_id" = section."id"
  AND revision."id" = section."scope_revision_id"
  AND outcome."id" = evidence."outcome_event_id";

ALTER TABLE "execution_section_evidence"
  ALTER COLUMN "work_order_id" SET NOT NULL,
  ALTER COLUMN "scope_revision_id" SET NOT NULL,
  ALTER COLUMN "technician_id" SET NOT NULL,
  ALTER COLUMN "purpose" SET NOT NULL;
CREATE INDEX "execution_section_evidence_work_order_id_scope_revision_id_idx" ON "execution_section_evidence"("work_order_id", "scope_revision_id");
ALTER TABLE "execution_section_evidence" ADD CONSTRAINT "execution_section_evidence_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "execution_section_evidence" ADD CONSTRAINT "execution_section_evidence_scope_revision_id_fkey" FOREIGN KEY ("scope_revision_id") REFERENCES "work_order_execution_scope_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "execution_section_evidence" ADD CONSTRAINT "execution_section_evidence_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
