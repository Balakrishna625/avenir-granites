-- ============================================================================
-- Add carried_forward column to customer_account_periods table
-- ============================================================================
-- This adds the missing carried_forward column that is referenced in 
-- settlement functions but was never added to the table schema.
-- 
-- The carried_forward column tracks amounts being moved to the next period
-- when a customer settles their account but still has outstanding balance.
-- ============================================================================

-- Add the carried_forward column
ALTER TABLE customer_account_periods 
ADD COLUMN IF NOT EXISTS carried_forward NUMERIC DEFAULT 0;

-- Update existing records to set carried_forward based on total_pending
-- (For historical data consistency)
UPDATE customer_account_periods
SET carried_forward = total_pending
WHERE carried_forward IS NULL AND total_pending IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN customer_account_periods.carried_forward IS 
'Amount carried forward to the next period after settlement. This is the outstanding balance that will become old_due_amount in the new period.';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'customer_account_periods' 
  AND column_name = 'carried_forward';
