-- ============================================================================
-- DIAGNOSTIC: Check Church Party Settlement Issue
-- ============================================================================
-- This will show us what's happening with the Church Party customer
-- Run this in Supabase SQL Editor to see the problem
-- ============================================================================

-- 1. Find Church Party customer
SELECT 
  id,
  name,
  old_due_amount,
  waived_amount,
  created_at
FROM customers
WHERE name ILIKE '%church%'
LIMIT 5;

-- 2. Get their periods (both active and settled)
SELECT 
  cap.id,
  cap.period_number,
  cap.is_active,
  cap.start_date,
  cap.end_date,
  cap.settlement_date,
  cap.total_invoiced,
  cap.total_received,
  cap.settlement_amount,
  cap.waived_amount,
  cap.total_pending,
  cap.old_due_amount as period_old_due
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE c.name ILIKE '%church%'
ORDER BY cap.period_number DESC;

-- 3. Get transactions in ACTIVE period
SELECT 
  t.id,
  t.date,
  t.mode,
  t.amount,
  t.note,
  t.period_id,
  cap.period_number,
  cap.is_active
FROM transactions t
JOIN customer_account_periods cap ON cap.id = t.period_id
JOIN customers c ON c.id = t.customer_id
WHERE c.name ILIKE '%church%'
  AND cap.is_active = true
ORDER BY t.date DESC;

-- 4. Get consignments in ACTIVE period
SELECT 
  c.id,
  c.date,
  c.total,
  c.period_id,
  cap.period_number,
  cap.is_active
FROM consignments c
JOIN customer_account_periods cap ON cap.id = c.period_id
JOIN customers cu ON cu.id = c.customer_id
WHERE cu.name ILIKE '%church%'
  AND cap.is_active = true
ORDER BY c.date DESC;

-- 5. Get waived transactions
SELECT 
  wt.id,
  wt.amount,
  wt.created_at
FROM waived_transactions wt
JOIN customers c ON c.id = wt.customer_id
WHERE c.name ILIKE '%church%';

-- 6. Calculate what the summary SHOULD show
SELECT 
  c.name,
  c.old_due_amount,
  c.waived_amount as customer_waived,
  cap.period_number,
  cap.is_active,
  (SELECT COALESCE(SUM(co.total), 0) FROM consignments co WHERE co.period_id = cap.id) as period_invoiced,
  (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.period_id = cap.id) as period_received,
  (SELECT COALESCE(SUM(wt.amount), 0) FROM waived_transactions wt WHERE wt.customer_id = c.id) as total_waived_transactions,
  -- Total receivables calculation
  (SELECT COALESCE(SUM(co.total), 0) FROM consignments co WHERE co.period_id = cap.id) + 
  c.old_due_amount - 
  (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.period_id = cap.id) - 
  (SELECT COALESCE(SUM(wt.amount), 0) FROM waived_transactions wt WHERE wt.customer_id = c.id) as calculated_receivables
FROM customers c
JOIN customer_account_periods cap ON cap.customer_id = c.id
WHERE c.name ILIKE '%church%'
  AND cap.is_active = true;
