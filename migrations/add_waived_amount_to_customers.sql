-- Add waived_amount column to customers table
-- This tracks the amount that customers have negotiated/purged from their final bill
-- This amount will be subtracted from their pending amount as they won't pay it

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS waived_amount DECIMAL(15, 2) DEFAULT 0.00;

-- Add comment to explain the column
COMMENT ON COLUMN customers.waived_amount IS 'Amount waived/purged by customer that will not be paid. Subtracted from total pending.';

-- Update existing customers to have 0 waived amount
UPDATE customers SET waived_amount = 0.00 WHERE waived_amount IS NULL;
