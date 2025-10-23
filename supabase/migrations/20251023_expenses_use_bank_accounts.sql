-- Migration: Change expenses to reference bank_accounts instead of expense_accounts
-- This allows expenses to be debited directly from customer payment collections

-- Drop the existing foreign key constraint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_account_id_fkey;

-- Add new foreign key constraint to bank_accounts
ALTER TABLE expenses 
ADD CONSTRAINT expenses_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES bank_accounts(id);

-- Update expense trigger to not update expense_accounts balance
-- (We'll track this separately since bank_accounts balance is calculated from transactions)
DROP TRIGGER IF EXISTS update_expense_account_balance ON expenses;
DROP FUNCTION IF EXISTS update_expense_account_balance();

COMMENT ON COLUMN expenses.account_id IS 'References bank_accounts - the account from which this expense is debited (customer payment collections)';
