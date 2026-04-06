-- Add multi-month expense allocation fields to expenses table
-- This allows splitting expenses across multiple months for accurate production cost calculation

-- Add is_multi_month_expense flag
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS is_multi_month_expense BOOLEAN DEFAULT FALSE;

-- Add allocated_amount (amount to use for this month's cost calculation)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC;

-- Add allocation_notes (explanation of the allocation)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS allocation_notes TEXT;

-- Add comments
COMMENT ON COLUMN expenses.is_multi_month_expense IS 
  'TRUE if this expense is split across multiple months. FALSE for single-month expenses.';

COMMENT ON COLUMN expenses.allocated_amount IS 
  'Amount allocated to this month for production cost calculation. NULL means use full amount.';

COMMENT ON COLUMN expenses.allocation_notes IS 
  'Explanation of how the expense is allocated (e.g., "60% used in March, 40% will be used in April")';

-- Set allocated_amount = amount for existing single-month expenses
UPDATE expenses
SET 
  is_multi_month_expense = FALSE,
  allocated_amount = total_amount
WHERE is_multi_month_expense IS NULL;
