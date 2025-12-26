-- ============================================================================
-- SETTLEMENT SYSTEM FIX SCRIPT
-- Run this AFTER running the diagnostic script
-- This will link orphaned records and recalculate totals
-- ============================================================================

-- ⚠️ IMPORTANT: Run the DIAGNOSTIC script first to confirm the issue!
-- This script is SAFE - it only updates period_id links and recalculates totals
-- No data is deleted

-- ============================================================================
-- BACKUP QUERY (Optional but Recommended)
-- Run this first to save current state
-- ============================================================================
CREATE TEMP TABLE backup_periods AS
SELECT * FROM customer_account_periods WHERE is_active = false;

-- You can check later with: SELECT * FROM backup_periods;

-- ============================================================================
-- FIX PART 1: Link Orphaned Consignments to Correct Periods
-- ============================================================================

-- This links consignments to the period they belong to based on their date
UPDATE consignments c
SET period_id = (
  SELECT cap.id 
  FROM customer_account_periods cap
  WHERE cap.customer_id = c.customer_id
    -- Match based on date falling within period range
    AND c.date >= cap.start_date
    AND (cap.end_date IS NULL OR c.date <= cap.end_date)
  -- If multiple periods match (shouldn't happen), pick the latest
  ORDER BY cap.period_number DESC
  LIMIT 1
)
WHERE c.period_id IS NULL
  AND c.customer_id IN (
    -- Only fix for customers who have account periods
    SELECT DISTINCT customer_id FROM customer_account_periods
  );

-- Show how many were fixed
SELECT 
  COUNT(*) as consignments_fixed
FROM consignments
WHERE period_id IS NOT NULL
  AND period_id IN (SELECT id FROM customer_account_periods);

-- ============================================================================
-- FIX PART 2: Link Orphaned Transactions to Correct Periods
-- ============================================================================

-- Same logic for transactions
UPDATE transactions t
SET period_id = (
  SELECT cap.id 
  FROM customer_account_periods cap
  WHERE cap.customer_id = t.customer_id
    AND t.date >= cap.start_date
    AND (cap.end_date IS NULL OR t.date <= cap.end_date)
  ORDER BY cap.period_number DESC
  LIMIT 1
)
WHERE t.period_id IS NULL
  AND t.customer_id IN (
    SELECT DISTINCT customer_id FROM customer_account_periods
  );

-- Show how many were fixed
SELECT 
  COUNT(*) as transactions_fixed
FROM transactions
WHERE period_id IS NOT NULL
  AND period_id IN (SELECT id FROM customer_account_periods);

-- ============================================================================
-- FIX PART 3: Recalculate Totals for ALL Settled Periods
-- ============================================================================

-- This recalculates total_invoiced and total_received from actual linked records
UPDATE customer_account_periods cap
SET 
  total_invoiced = COALESCE((
    SELECT SUM(c.total) 
    FROM consignments c 
    WHERE c.period_id = cap.id
  ), 0),
  total_received = COALESCE((
    SELECT SUM(t.amount) 
    FROM transactions t 
    WHERE t.period_id = cap.id
  ), 0),
  -- Recalculate total_pending based on new totals
  total_pending = COALESCE((
    SELECT SUM(c.total) FROM consignments c WHERE c.period_id = cap.id
  ), 0) - COALESCE((
    SELECT SUM(t.amount) FROM transactions t WHERE t.period_id = cap.id
  ), 0) - COALESCE(cap.waived_amount, 0) + COALESCE(cap.old_due_amount, 0) - COALESCE(cap.settlement_amount, 0)
WHERE cap.is_active = false;

-- Show affected periods
SELECT 
  c.name as customer_name,
  cap.period_number,
  cap.settlement_date,
  cap.total_invoiced as new_invoiced,
  cap.total_received as new_received,
  cap.total_pending as new_pending
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE cap.is_active = false
ORDER BY cap.settlement_date DESC
LIMIT 20;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check if any consignments/transactions are still unlinked
SELECT 
  'Unlinked Consignments' as issue,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ FIXED' ELSE '❌ STILL HAVE ISSUES' END as status
FROM consignments
WHERE period_id IS NULL
  AND customer_id IN (SELECT DISTINCT customer_id FROM customer_account_periods)
UNION ALL
SELECT 
  'Unlinked Transactions',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ FIXED' ELSE '❌ STILL HAVE ISSUES' END
FROM transactions
WHERE period_id IS NULL
  AND customer_id IN (SELECT DISTINCT customer_id FROM customer_account_periods);

-- 2. Verify specific customer (Sai Mayuri Gopi Garu)
SELECT 
  c.name as customer_name,
  cap.period_number,
  cap.settlement_date,
  cap.total_invoiced,
  cap.total_received,
  cap.total_pending,
  cap.waived_amount,
  cap.settlement_amount,
  '---' as separator,
  -- Count actual linked records
  (SELECT COUNT(*) FROM consignments con WHERE con.period_id = cap.id) as consignments_count,
  (SELECT COUNT(*) FROM transactions t WHERE t.period_id = cap.id) as transactions_count,
  CASE 
    WHEN cap.total_invoiced = 0 AND cap.total_received = 0 AND 
         (SELECT COUNT(*) FROM consignments con WHERE con.period_id = cap.id) > 0
    THEN '❌ STILL BROKEN'
    WHEN cap.total_invoiced > 0 OR cap.total_received > 0
    THEN '✅ FIXED'
    ELSE '⚠️ No Data'
  END as fix_status
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE c.name ILIKE '%Sai Mayuri%' OR c.name ILIKE '%Gopi Garu%'
ORDER BY cap.period_number;

-- 3. Compare before and after (if you created backup)
SELECT 
  c.name,
  b.period_number,
  '---' as separator,
  b.total_invoiced as old_invoiced,
  cap.total_invoiced as new_invoiced,
  cap.total_invoiced - b.total_invoiced as invoiced_change,
  '---' as separator2,
  b.total_received as old_received,
  cap.total_received as new_received,
  cap.total_received - b.total_received as received_change
FROM backup_periods b
JOIN customer_account_periods cap ON cap.id = b.id
JOIN customers c ON c.id = cap.customer_id
WHERE b.total_invoiced != cap.total_invoiced OR b.total_received != cap.total_received
ORDER BY cap.settlement_date DESC;

-- ============================================================================
-- CLEANUP (Optional)
-- ============================================================================

-- If verification looks good, drop the backup table
-- DROP TABLE IF EXISTS backup_periods;

-- ============================================================================
-- PREVENTION: Ensure Triggers Are Working
-- ============================================================================

-- Check if triggers exist and are enabled
SELECT 
  tgname as trigger_name,
  tgenabled,
  CASE tgenabled 
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled - NEEDS FIX'
    ELSE '⚠️ Unknown State'
  END as status,
  CASE tgenabled 
    WHEN 'D' THEN 'Run: ALTER TABLE consignments ENABLE TRIGGER consignment_auto_period;'
    ELSE 'OK'
  END as fix_command
FROM pg_trigger 
WHERE tgname IN ('consignment_auto_period', 'transaction_auto_period');

-- If triggers don't exist, recreate them:
-- (Copy from add_customer_settlement_system.sql migration)

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- If all verifications pass:
-- ✅ Orphaned records are now linked
-- ✅ Settlement history shows correct totals
-- ✅ Future records will auto-link via triggers
-- ✅ No data was lost
-- ============================================================================
