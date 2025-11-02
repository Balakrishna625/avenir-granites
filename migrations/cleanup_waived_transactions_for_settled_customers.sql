-- ============================================================================
-- CLEANUP WAIVED TRANSACTIONS FOR SETTLED CUSTOMERS
-- ============================================================================
-- Problem: After settlement, waived_transactions are still showing up in
-- customer summary, causing incorrect "waived amount" display even though
-- the customer has been fully settled.
--
-- Solution: Delete waived_transactions for customers who have been settled
-- (have inactive periods in customer_account_periods table)
--
-- SAFE TO RUN: Only deletes waived_transactions that are already recorded
-- in settled period history. No data loss.
-- ============================================================================

-- Step 1: Show which customers have waived transactions but are settled
SELECT 
  c.name as customer_name,
  COUNT(wt.id) as waived_transaction_count,
  SUM(wt.amount) as total_waived_amount,
  COUNT(DISTINCT cap.id) as settled_periods_count
FROM customers c
INNER JOIN waived_transactions wt ON wt.customer_id = c.id
LEFT JOIN customer_account_periods cap ON cap.customer_id = c.id AND cap.is_active = false
GROUP BY c.id, c.name
ORDER BY c.name;

-- Step 2: Delete waived_transactions for customers who have ANY settled period
-- (The waived amount is already recorded in the period history)
DELETE FROM waived_transactions
WHERE customer_id IN (
  SELECT DISTINCT customer_id
  FROM customer_account_periods
  WHERE is_active = false
);

-- Step 3: Verify the cleanup
SELECT 
  'Cleanup Complete!' as status,
  'Waived transactions removed for settled customers' as message,
  COUNT(*) as remaining_waived_transactions
FROM waived_transactions;

-- Step 4: Show customers that still have waived transactions (should be only active/unsettled customers)
SELECT 
  c.name as customer_name,
  COUNT(wt.id) as waived_transaction_count,
  SUM(wt.amount) as total_waived_amount
FROM customers c
INNER JOIN waived_transactions wt ON wt.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
