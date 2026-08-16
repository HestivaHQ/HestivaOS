-- Accepted ONE_TIME Quotes own one complete, restricted operational result.
-- Resolution intent remains historical after CREATE_NEW materializes the link.
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_customer_resolution_consistency";
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_property_resolution_consistency";

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_resolution_consistency" CHECK (
  ("customer_resolution" = 'USE_EXISTING' AND "customer_id" IS NOT NULL)
  OR ("customer_resolution" = 'CREATE_NEW' AND ("customer_id" IS NULL OR "status" = 'ACCEPTED'))
  OR "customer_resolution" IS NULL
);

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_property_resolution_consistency" CHECK (
  ("property_resolution" = 'USE_EXISTING' AND "property_id" IS NOT NULL)
  OR ("property_resolution" = 'CREATE_NEW' AND ("property_id" IS NULL OR "status" = 'ACCEPTED'))
  OR "property_resolution" IS NULL
);

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_accepted_operational_shape" CHECK (
  "status" <> 'ACCEPTED'
  OR (
    "accepted_at" IS NOT NULL
    AND "accepted_by_user_id" IS NOT NULL
    AND "accepted_revision_id" IS NOT NULL
    AND "customer_id" IS NOT NULL
    AND "property_id" IS NOT NULL
    AND (
      ("work_order_id" IS NOT NULL AND "recurring_agreement_id" IS NULL)
      OR ("work_order_id" IS NULL AND "recurring_agreement_id" IS NOT NULL)
    )
  )
);

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "quotes_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
