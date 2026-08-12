ALTER TABLE "work_order_add_ons"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "recurring_service_agreement_add_ons"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "work_order_add_ons"
ADD CONSTRAINT "work_order_add_ons_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "recurring_service_agreement_add_ons"
ADD CONSTRAINT "recurring_service_agreement_add_ons_quantity_positive" CHECK ("quantity" > 0);
