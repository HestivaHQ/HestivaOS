-- PostgreSQL requires newly-added enum labels to commit before they are used by
-- constraints or data in a later transaction. Keep this migration enum-only so
-- Prisma commits these labels before the following response-record migration.
ALTER TYPE "QuoteCustomerEngagementEventType" ADD VALUE 'CUSTOMER_ACCEPTED';
ALTER TYPE "QuoteCustomerEngagementEventType" ADD VALUE 'CUSTOMER_DECLINED';
