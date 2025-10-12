-- Migration script to add old_due_amount column to customers table
-- Run this script before implementing the Old Due Amount feature

-- Add old_due_amount column to customers table
ALTER TABLE customers 
ADD COLUMN old_due_amount NUMERIC DEFAULT 0 NOT NULL;

-- Add constraint to ensure old_due_amount is not negative
ALTER TABLE customers 
ADD CONSTRAINT customers_old_due_amount_check CHECK (old_due_amount >= 0);

-- Add comment to document the column purpose
COMMENT ON COLUMN customers.old_due_amount IS 'Previous unpaid amount before current consignments - tracked as cash receivable';

-- Create index for performance if needed for reporting
CREATE INDEX IF NOT EXISTS customers_old_due_amount_idx ON customers(old_due_amount) WHERE old_due_amount > 0;

-- Update existing customers to have 0 old due amount (already handled by DEFAULT)
-- UPDATE customers SET old_due_amount = 0 WHERE old_due_amount IS NULL;

-- Verify the migration
SELECT 
    columns.column_name, 
    columns.data_type, 
    columns.is_nullable, 
    columns.column_default,
    check_constraints.constraint_name
FROM information_schema.columns 
LEFT JOIN (
    SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'CHECK'
        AND tc.table_name = 'customers'
) check_constraints ON check_constraints.column_name = columns.column_name
WHERE columns.table_name = 'customers' 
    AND columns.column_name = 'old_due_amount';