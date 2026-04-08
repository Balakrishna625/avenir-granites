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

-- Add parent_expense_id to track the original expense (for auto-carry forward)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS parent_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;

-- Add original_amount to track the full amount from the first month
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC;

-- Add remaining_amount to track what's left to allocate in future months
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;

-- Add comments
COMMENT ON COLUMN expenses.is_multi_month_expense IS 
  'TRUE if this expense is split across multiple months. FALSE for single-month expenses.';

COMMENT ON COLUMN expenses.allocated_amount IS 
  'Amount allocated to this month for production cost calculation. NULL means use full amount.';

COMMENT ON COLUMN expenses.allocation_notes IS 
  'Explanation of how the expense is allocated (e.g., "60% used in March, 40% will be used in April")';

COMMENT ON COLUMN expenses.parent_expense_id IS 
  'References the original expense if this is an auto-carried forward entry from a previous month.';

COMMENT ON COLUMN expenses.original_amount IS 
  'The original full amount from the first month (for tracking purposes).';

COMMENT ON COLUMN expenses.remaining_amount IS 
  'Amount remaining to be allocated in future months.';

-- Set allocated_amount = amount for existing single-month expenses
UPDATE expenses
SET 
  is_multi_month_expense = FALSE,
  allocated_amount = total_amount,
  original_amount = total_amount,
  remaining_amount = 0
WHERE is_multi_month_expense IS NULL;
