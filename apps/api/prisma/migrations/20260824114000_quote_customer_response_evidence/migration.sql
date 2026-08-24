-- PostgreSQL requires newly-added enum labels to commit before they are used by
-- constraints or data in a later transaction. Keep this migration enum-only.
ALTER TYPE "QuoteCustomerEngagementEventType" ADD VALUE 'CUSTOMER_ACCEPTED';
ALTER TYPE "QuoteCustomerEngagementEventType" ADD VALUE 'CUSTOMER_DECLINED';
