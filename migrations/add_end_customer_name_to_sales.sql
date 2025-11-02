-- ============================================================================
-- ADD END CUSTOMER NAME TO SALES TABLE
-- ============================================================================
-- Adds a text field to store the end customer name that the official bill
-- was written for. This is useful when the bill customer differs from the
-- actual end customer.
-- ============================================================================

-- Add the end_customer_name column to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS end_customer_name TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN sales.end_customer_name IS 
'Name of the end customer for whom the official bill was written. May differ from the customer_id who is making the purchase.';

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sales' 
  AND column_name = 'end_customer_name';
