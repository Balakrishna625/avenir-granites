-- ============================================================================
-- ADD CUSTOMER TYPE CLASSIFICATION
-- ============================================================================
-- This allows marking customers as 'regular' or 'one-time' to manage dropdown
-- visibility while preserving all historical data.
-- 
-- Business Rule: One-time customers are hidden from Customer Payments dropdown
-- ONLY if they have zero pending balance (fully settled).
-- ============================================================================

-- Step 1: Add customer_type column with default value 'regular'
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'regular';

-- Step 2: Update all existing customers to 'regular' (idempotent)
UPDATE customers 
SET customer_type = 'regular' 
WHERE customer_type IS NULL;

-- Step 3: Add constraint to ensure only valid values
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS check_customer_type;

ALTER TABLE customers 
ADD CONSTRAINT check_customer_type 
CHECK (customer_type IN ('regular', 'one-time'));

-- Step 4: Create index for filtering performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_customers_type 
ON customers(customer_type);

-- Step 5: Verify the migration
SELECT 
  'Customer Type Feature Added!' as status,
  'All existing customers set to regular' as message,
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE customer_type = 'regular') as regular_customers,
  COUNT(*) FILTER (WHERE customer_type = 'one-time') as one_time_customers
FROM customers;

-- Show sample of customers with their types
SELECT 
  id,
  name,
  customer_type,
  created_at
FROM customers
ORDER BY created_at DESC
LIMIT 5;
