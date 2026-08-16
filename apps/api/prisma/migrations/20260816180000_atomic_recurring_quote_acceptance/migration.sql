-- Accepted recurring Quotes require both their agreement and initial visit.
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_accepted_operational_shape";

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_accepted_operational_shape" CHECK (
  "status" <> 'ACCEPTED'
  OR (
    "accepted_at" IS NOT NULL
    AND "accepted_by_user_id" IS NOT NULL
    AND "accepted_revision_id" IS NOT NULL
    AND "customer_id" IS NOT NULL
    AND "property_id" IS NOT NULL
    AND "work_order_id" IS NOT NULL
  )
);
