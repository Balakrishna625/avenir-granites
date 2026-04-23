-- Migration: Add external_purchase column to sales table
-- Purpose: Mark sales where material was bought from outside (not factory production)
-- Such sales are excluded from:
--   - Total SqFt Sold in monthly summary
--   - Contractor Dinesh payable calculation (based on factory sqft sold)

ALTER TABLE sales ADD COLUMN IF NOT EXISTS external_purchase BOOLEAN DEFAULT false;

COMMENT ON COLUMN sales.external_purchase IS 'True if material was purchased from outside and resold - excluded from factory production stats, monthly summary sqft, and contractor payable calculations';

-- Backfill existing rows to false (already default, but explicit)
UPDATE sales SET external_purchase = false WHERE external_purchase IS NULL;
