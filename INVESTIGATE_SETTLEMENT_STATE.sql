-- ============================================================================
-- INVESTIGATION SCRIPT - Run this in Supabase SQL Editor
-- ============================================================================
-- IMPORTANT: Run each query ONE AT A TIME and note the results
-- This helps us understand your current state before making any changes

-- ============================================================================
-- QUERY 1: Check if you have any settled accounts
-- ============================================================================
-- Copy and run this query first

SELECT 
    c.name as customer_name,
    cap.period_number,
    cap.settlement_date,
    cap.total_invoiced,
    cap.total_received,
    cap.settlement_amount,
    cap.waived_amount,
    cap.settlement_mode
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE cap.is_active = false
  AND cap.settlement_date IS NOT NULL
ORDER BY cap.settlement_date DESC
LIMIT 10;

-- RESULT: How many rows did this return? 
-- If 0 rows = Good! No settlements yet, so no corrupted data
-- If >0 rows = We need to check if they have the double-counting issue

-- ============================================================================
-- QUERY 2: Check for settlement-created transactions
-- ============================================================================
-- Copy and run this query

SELECT 
    c.name as customer_name,
    t.date,
    t.amount,
    t.mode,
    t.note
FROM transactions t
JOIN customers c ON c.id = t.customer_id
WHERE t.note LIKE '%Settlement%'
   OR t.note LIKE '%Account settled%'
ORDER BY t.date DESC
LIMIT 10;

-- RESULT: How many rows? These are the duplicate transactions we're trying to prevent

-- ============================================================================
-- QUERY 3: Check customers with waived amounts
-- ============================================================================
-- Copy and run this query

SELECT 
    name as customer_name,
    waived_amount,
    old_due_amount
FROM customers
WHERE waived_amount > 0
ORDER BY name;

-- RESULT: These customers have waived amounts that should be cleared after settlement

-- ============================================================================
-- THAT'S IT FOR INVESTIGATION!
-- ============================================================================
-- Now tell me:
-- 1. How many settled accounts did Query 1 show?
-- 2. How many settlement transactions did Query 2 show?
-- 3. How many customers with waived amounts did Query 3 show?

