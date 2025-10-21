-- IMMEDIATE FIX: Clear Mahalakshmi's waived transactions after settlement
-- She has already settled, but waived transactions are still showing
-- This script manually clears them (one-time fix for this customer only)

-- Step 1: Check current waived transactions for Mahalakshmi
SELECT 
    'Before cleanup' as status,
    c.name,
    count(wt.*) as waived_count,
    sum(wt.amount) as total_waived
FROM customers c
LEFT JOIN waived_transactions wt ON wt.customer_id = c.id
WHERE c.name ILIKE '%mahalakshmi%'
GROUP BY c.id, c.name;

-- Step 2: Delete waived transactions for Mahalakshmi ONLY
DELETE FROM waived_transactions
WHERE customer_id = (
    SELECT id FROM customers WHERE name ILIKE '%mahalakshmi%'
);

-- Step 3: Verify cleanup
SELECT 
    'After cleanup' as status,
    c.name,
    count(wt.*) as waived_count,
    sum(wt.amount) as total_waived
FROM customers c
LEFT JOIN waived_transactions wt ON wt.customer_id = c.id
WHERE c.name ILIKE '%mahalakshmi%'
GROUP BY c.id, c.name;

-- Step 4: Verify her current period has waived_amount = 0
SELECT 
    c.name,
    cap.period_number,
    cap.is_active,
    cap.waived_amount,
    cap.old_due_amount,
    cap.total_pending
FROM customers c
JOIN customer_account_periods cap ON cap.customer_id = c.id
WHERE c.name ILIKE '%mahalakshmi%'
    AND cap.is_active = true;
