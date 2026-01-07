-- Migration: Add factory mining tracking for "only bill" transactions
-- Run this SQL in your database to add factory mining amount tracking

-- Add factory_mining_rate column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS factory_mining_rate NUMERIC DEFAULT 7;

-- Add factory_mining_amount column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS factory_mining_amount NUMERIC DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN sales.factory_mining_rate IS 'Rate per sqft charged to our factory account for only-bill transactions (default: 7 rupees)';
COMMENT ON COLUMN sales.factory_mining_amount IS 'Total amount charged to our factory account (rate × total sqft from official bill) for only-bill transactions';

-- Factory mining tracking:
-- - Only applies to "only bill" transactions
-- - Represents internal charge when buying from other factory
-- - Rate is configurable (default 7 rupees per sqft)
-- - Does NOT affect sales statistics or customer calculations
-- - Tracked separately for factory account reconciliation
