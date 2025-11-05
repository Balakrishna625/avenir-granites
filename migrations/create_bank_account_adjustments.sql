-- ============================================================================
-- Create bank_account_adjustments table
-- ============================================================================
-- This table stores opening balance adjustments for bank accounts to handle
-- the scenario where transactions were tracked but expenses were not tracked
-- in the past. This allows "settling" the account with current actual balance
-- and tracking forward from that point.
-- 
-- Use case: You have historical customer payment records but didn't track 
-- expenses before. To start fresh, you adjust the opening balance to match
-- the actual current balance in the bank account, and from that point forward,
-- all transactions and expenses will be tracked accurately.
-- ============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS bank_account_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  adjustment_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- Add unique constraint (one adjustment per bank account)
-- This allows upsert behavior in the API
ALTER TABLE bank_account_adjustments 
ADD CONSTRAINT unique_bank_account_adjustment 
UNIQUE (bank_account_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_account_adjustments_effective_date 
ON bank_account_adjustments(effective_date);

-- Add comments for documentation
COMMENT ON TABLE bank_account_adjustments IS 
'Stores opening balance adjustments for bank accounts to handle pre-tracking settlements. Used when historical transactions exist but expenses were not tracked, allowing a fresh start with accurate current balances.';

COMMENT ON COLUMN bank_account_adjustments.adjustment_amount IS 
'The amount to add to the opening balance. Can be positive (add money) or negative (subtract money) to match actual bank balance.';

COMMENT ON COLUMN bank_account_adjustments.effective_date IS 
'The date from which this adjustment is effective. Typically set to the start date of tracking.';

COMMENT ON COLUMN bank_account_adjustments.notes IS 
'Description of why this adjustment was made. Example: "Opening balance adjustment for pre-tracking settlements - actual bank balance as of 2025-01-01"';

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE bank_account_adjustments ENABLE ROW LEVEL SECURITY;

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bank_account_adjustments'
ORDER BY ordinal_position;
