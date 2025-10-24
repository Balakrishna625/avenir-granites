-- Migration: Add opening balance adjustments for bank accounts
-- This allows setting a starting balance to account for transactions that happened before tracking began

-- Create bank_account_adjustments table
CREATE TABLE IF NOT EXISTS bank_account_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  adjustment_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Only one adjustment per account (can be updated)
  CONSTRAINT unique_adjustment_per_account UNIQUE(bank_account_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_account_adjustments_account_id 
ON bank_account_adjustments(bank_account_id);

-- Add comments
COMMENT ON TABLE bank_account_adjustments IS 'Stores opening balance adjustments for bank accounts to account for pre-tracking settlements';
COMMENT ON COLUMN bank_account_adjustments.adjustment_amount IS 'Amount to adjust opening balance (positive = previous credit, negative = previous debit)';
COMMENT ON COLUMN bank_account_adjustments.notes IS 'Reason for adjustment (e.g., "Previous settlements before Oct 2025")';
COMMENT ON COLUMN bank_account_adjustments.effective_date IS 'Date from which this adjustment is effective';

-- Insert default adjustments for existing accounts (0 amount, can be updated later)
INSERT INTO bank_account_adjustments(bank_account_id, adjustment_amount, notes)
SELECT id, 0, 'No adjustment - tracking from beginning'
FROM bank_accounts
ON CONFLICT (bank_account_id) DO NOTHING;
