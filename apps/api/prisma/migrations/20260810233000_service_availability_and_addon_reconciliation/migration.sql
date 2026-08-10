-- PostgreSQL requires a newly added enum value to commit before another migration uses it.
-- Slice 5K data reconciliation therefore follows in 20260810233100.
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'BOTH';
