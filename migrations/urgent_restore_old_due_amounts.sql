-- URGENT: Restore Old Due Amounts for All Customers Except Mahalakshmi
-- Problem: The fix_old_due_amount_calculation.sql was run and it reset ALL customers' old_due_amount to 0
-- Solution: Restore old_due_amount from settlement history for customers who were incorrectly reset

-- STEP 1: Show what was lost
DO $$
DECLARE
    v_affected_count int;
BEGIN
    -- Count customers who have settlement history but now have 0 old_due_amount
    SELECT COUNT(DISTINCT customer_id)
    INTO v_affected_count
    FROM customer_account_periods
    WHERE is_active = false
      AND old_due_amount > 0
      AND customer_id IN (
          SELECT id FROM customers WHERE old_due_amount = 0
      );
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RESTORATION NEEDED:';
    RAISE NOTICE 'Number of customers affected: %', v_affected_count;
    RAISE NOTICE '==========================================';
END $$;

-- STEP 2: Show customers who need restoration
-- These are customers who have settled periods with old_due_amount > 0 but customers.old_due_amount = 0
SELECT 
    c.name as customer_name,
    c.old_due_amount as current_old_due,
    cap.old_due_amount as should_be_old_due,
    cap.settlement_date,
    cap.period_number
FROM customers c
JOIN customer_account_periods cap ON cap.customer_id = c.id
WHERE cap.is_active = false
  AND c.old_due_amount = 0
  AND cap.old_due_amount > 0
ORDER BY cap.settlement_date DESC;

-- STEP 3: Restore old_due_amount from the most recent settled period
-- For customers who have old_due_amount = 0 but their last settled period had old_due_amount > 0
WITH last_settled_periods AS (
    SELECT DISTINCT ON (customer_id)
        customer_id,
        old_due_amount,
        period_number,
        settlement_date
    FROM customer_account_periods
    WHERE is_active = false
      AND settlement_date IS NOT NULL
    ORDER BY customer_id, period_number DESC
)
UPDATE customers c
SET old_due_amount = lsp.old_due_amount
FROM last_settled_periods lsp
WHERE c.id = lsp.customer_id
  AND c.old_due_amount = 0
  AND lsp.old_due_amount > 0
  AND c.name != 'MahaLakshmi'  -- Exclude Mahalakshmi if you want her to stay at 0
  AND c.name != 'Mahalakshmi';

-- STEP 4: Verify restoration
DO $$
DECLARE
    v_restored_count int;
    v_total_old_due numeric;
BEGIN
    GET DIAGNOSTICS v_restored_count = ROW_COUNT;
    
    SELECT COALESCE(SUM(old_due_amount), 0)
    INTO v_total_old_due
    FROM customers;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RESTORATION COMPLETE:';
    RAISE NOTICE 'Customers restored: %', v_restored_count;
    RAISE NOTICE 'New total old due amount: ₹%', v_total_old_due;
    RAISE NOTICE '==========================================';
END $$;

-- STEP 5: Show final state
SELECT 
    c.name as customer_name,
    c.old_due_amount as current_old_due,
    COALESCE(cap.old_due_amount, 0) as active_period_old_due,
    CASE 
        WHEN c.old_due_amount > 0 THEN 'Has old due'
        ELSE 'Clean slate'
    END as status
FROM customers c
LEFT JOIN customer_account_periods cap ON cap.customer_id = c.id AND cap.is_active = true
ORDER BY c.old_due_amount DESC;

-- STEP 6: Remove the problematic trigger that was causing global updates
DROP TRIGGER IF EXISTS trigger_sync_customer_old_due ON customer_account_periods;
DROP FUNCTION IF EXISTS sync_customer_old_due_amount();

COMMENT ON TABLE customers IS 
'WARNING: old_due_amount should only be updated during settlement process for THAT SPECIFIC CUSTOMER. 
Never run global updates that affect all customers at once.';

-- Final message
SELECT 
    'Restoration complete!' as status,
    'Old due amounts restored from settlement history' as message,
    'Problematic trigger removed' as note;
