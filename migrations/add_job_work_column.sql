-- Migration: Add job_work column to sales table
-- Run this SQL in your database to add job work tracking feature

-- Add job_work column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS job_work BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN sales.job_work IS 'True if this is a job work transaction (polishing service) - customer provides material for processing';

-- Job work transactions:
-- - Customer provides unpolished granite
-- - We charge for polishing service (rate per sqft)
-- - Additional loading/unloading charges
-- - Amount is added to customer payable balance
-- - Does NOT affect average selling prices or sales statistics
