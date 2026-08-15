ALTER TABLE "quotes"
  ADD COLUMN "accepted_revision_id" UUID;

DROP INDEX "quotes_work_order_id_idx";
DROP INDEX "quotes_recurring_agreement_id_idx";

CREATE UNIQUE INDEX "quotes_accepted_revision_id_key"
  ON "quotes"("accepted_revision_id");

CREATE UNIQUE INDEX "quotes_work_order_id_key"
  ON "quotes"("work_order_id");

CREATE UNIQUE INDEX "quotes_recurring_agreement_id_key"
  ON "quotes"("recurring_agreement_id");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_accepted_revision_id_fkey"
  FOREIGN KEY ("accepted_revision_id") REFERENCES "quote_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "quotes_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "quotes_recurring_agreement_id_fkey"
  FOREIGN KEY ("recurring_agreement_id") REFERENCES "recurring_service_agreements"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
