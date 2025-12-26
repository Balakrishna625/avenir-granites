-- ============================================================================
-- SETTLEMENT SYSTEM DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- STEP 1: Check overall period_id linkage status
-- This shows how many records are linked vs unlinked
SELECT 
  'Consignments' as table_name,
  COUNT(*) as total_records,
  COUNT(period_id) as with_period_id,
  COUNT(*) - COUNT(period_id) as missing_period_id,
  ROUND(100.0 * COUNT(period_id) / NULLIF(COUNT(*), 0), 2) as linked_percentage
FROM consignments
UNION ALL
SELECT 
  'Transactions',
  COUNT(*),
  COUNT(period_id),
  COUNT(*) - COUNT(period_id),
  ROUND(100.0 * COUNT(period_id) / NULLIF(COUNT(*), 0), 2)
FROM transactions;

-- STEP 2: Find the specific customer with the issue
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  cap.id as period_id,
  cap.period_number,
  cap.start_date,
  cap.end_date,
  cap.is_active,
  cap.total_invoiced,
  cap.total_received,
  cap.waived_amount,
  cap.settlement_amount
FROM customers c
JOIN customer_account_periods cap ON cap.customer_id = c.id
WHERE c.name ILIKE '%Sai Mayuri%' OR c.name ILIKE '%Gopi Garu%'
ORDER BY cap.period_number;

-- STEP 3: Check actual consignments and their period linkage
SELECT 
  c.name as customer_name,
  con.date as consignment_date,
  con.total as consignment_amount,
  con.period_id as linked_to_period,
  cap.period_number,
  cap.start_date as period_start,
  cap.end_date as period_end,
  CASE 
    WHEN con.period_id IS NULL THEN '❌ NOT LINKED'
    WHEN cap.id IS NULL THEN '❌ INVALID PERIOD'
    ELSE '✅ OK'
  END as status
FROM consignments con
JOIN customers c ON c.id = con.customer_id
LEFT JOIN customer_account_periods cap ON cap.id = con.period_id
WHERE c.name ILIKE '%Sai Mayuri%' OR c.name ILIKE '%Gopi Garu%'
ORDER BY con.date DESC;

-- STEP 4: Check actual transactions and their period linkage
SELECT 
  c.name as customer_name,
  t.date as transaction_date,
  t.amount as transaction_amount,
  t.mode,
  t.period_id as linked_to_period,
  cap.period_number,
  cap.start_date as period_start,
  cap.end_date as period_end,
  CASE 
    WHEN t.period_id IS NULL THEN '❌ NOT LINKED'
    WHEN cap.id IS NULL THEN '❌ INVALID PERIOD'
    ELSE '✅ OK'
  END as status
FROM transactions t
JOIN customers c ON c.id = t.customer_id
LEFT JOIN customer_account_periods cap ON cap.id = t.period_id
WHERE c.name ILIKE '%Sai Mayuri%' OR c.name ILIKE '%Gopi Garu%'
ORDER BY t.date DESC;

-- STEP 5: Compare stored totals vs actual totals for settled periods
SELECT 
  c.name as customer_name,
  cap.period_number,
  cap.settlement_date,
  '---' as separator,
  cap.total_invoiced as stored_invoiced,
  COALESCE((SELECT SUM(con.total) FROM consignments con WHERE con.period_id = cap.id), 0) as actual_invoiced,
  cap.total_invoiced - COALESCE((SELECT SUM(con.total) FROM consignments con WHERE con.period_id = cap.id), 0) as invoiced_diff,
  '---' as separator2,
  cap.total_received as stored_received,
  COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.period_id = cap.id), 0) as actual_received,
  cap.total_received - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.period_id = cap.id), 0) as received_diff,
  '---' as separator3,
  CASE 
    WHEN cap.total_invoiced != COALESCE((SELECT SUM(con.total) FROM consignments con WHERE con.period_id = cap.id), 0) 
      OR cap.total_received != COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.period_id = cap.id), 0)
    THEN '❌ MISMATCH - NEEDS FIX'
    ELSE '✅ OK'
  END as status
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE cap.is_active = false
ORDER BY cap.settlement_date DESC
LIMIT 20;

-- STEP 6: List ALL unlinked consignments (orphaned records)
SELECT 
  c.name as customer_name,
  con.id as consignment_id,
  con.date,
  con.total,
  con.remarks,
  con.period_id as current_period_link
FROM consignments con
JOIN customers c ON c.id = con.customer_id
WHERE con.period_id IS NULL
ORDER BY con.date DESC;

-- STEP 7: List ALL unlinked transactions (orphaned records)
SELECT 
  c.name as customer_name,
  t.id as transaction_id,
  t.date,
  t.amount,
  t.mode,
  t.note,
  t.period_id as current_period_link
FROM transactions t
JOIN customers c ON c.id = t.customer_id
WHERE t.period_id IS NULL
ORDER BY t.date DESC;

-- STEP 8: Check if auto-assignment triggers exist
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  CASE tgenabled 
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    ELSE '⚠️ Other'
  END as status
FROM pg_trigger 
WHERE tgname IN ('consignment_auto_period', 'transaction_auto_period');

-- ============================================================================
-- ANALYSIS SUMMARY
-- ============================================================================
-- After running the above queries, check:
--
-- 1. From STEP 1: What percentage of records are linked? 
--    - If < 100%, you have orphaned records
--
-- 2. From STEP 3 & 4: Are the specific consignment/transaction showing "NOT LINKED"?
--    - This is the root cause
--
-- 3. From STEP 5: Are stored totals != actual totals?
--    - This confirms the data integrity issue
--
-- 4. From STEP 6 & 7: How many orphaned records exist?
--    - Determines scope of fix needed
--
-- 5. From STEP 8: Are triggers enabled?
--    - If disabled, new records will also have issues
--
-- Based on results, proceed to FIX script
-- ============================================================================
