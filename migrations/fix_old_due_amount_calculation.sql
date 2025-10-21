-- Fix Old Due Amount Calculation Issue
-- Problem: Total Previous Dues showing ₹22,54,806 which includes old values from settled customers
-- Solution: Update all customers' old_due_amount to match their active period's old_due_amount

-- STEP 1: Diagnostic - Show current state
DO $$
DECLARE
    v_total_old_due numeric;
    v_count_customers int;
    v_count_with_old_due int;
BEGIN
    SELECT 
        coalesce(sum(old_due_amount), 0),
        count(*),
        count(*) FILTER (WHERE old_due_amount > 0)
    INTO v_total_old_due, v_count_customers, v_count_with_old_due
    FROM customers;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CURRENT STATE (BEFORE FIX):';
    RAISE NOTICE 'Total customers: %', v_count_customers;
    RAISE NOTICE 'Customers with old due: %', v_count_with_old_due;
    RAISE NOTICE 'Total old due amount: ₹%', v_total_old_due;
    RAISE NOTICE '==========================================';
END $$;

-- STEP 2: Show customers with mismatched old_due_amount
-- (customers.old_due_amount != their active period's old_due_amount)
SELECT 
    c.name,
    c.old_due_amount as customer_old_due,
    coalesce(cap.old_due_amount, 0) as active_period_old_due,
    c.old_due_amount - coalesce(cap.old_due_amount, 0) as difference
FROM customers c
LEFT JOIN customer_account_periods cap 
    ON cap.customer_id = c.id AND cap.is_active = true
WHERE c.old_due_amount != coalesce(cap.old_due_amount, 0)
ORDER BY difference DESC;

-- STEP 3: Fix all customers' old_due_amount to match their active period
-- This ensures the customers table reflects the actual carried-forward amount
UPDATE customers c
SET old_due_amount = coalesce(
    (SELECT old_due_amount 
     FROM customer_account_periods 
     WHERE customer_id = c.id 
       AND is_active = true 
     LIMIT 1
    ),
    0 -- If no active period, set to 0
)
WHERE c.old_due_amount != coalesce(
    (SELECT old_due_amount 
     FROM customer_account_periods 
     WHERE customer_id = c.id 
       AND is_active = true 
     LIMIT 1
    ),
    0
);

-- STEP 4: Verify the fix
DO $$
DECLARE
    v_total_old_due numeric;
    v_count_customers int;
    v_count_with_old_due int;
    v_rows_updated int;
BEGIN
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    SELECT 
        coalesce(sum(old_due_amount), 0),
        count(*),
        count(*) FILTER (WHERE old_due_amount > 0)
    INTO v_total_old_due, v_count_customers, v_count_with_old_due
    FROM customers;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'AFTER FIX:';
    RAISE NOTICE 'Rows updated: %', v_rows_updated;
    RAISE NOTICE 'Total customers: %', v_count_customers;
    RAISE NOTICE 'Customers with old due: %', v_count_with_old_due;
    RAISE NOTICE 'Total old due amount: ₹%', v_total_old_due;
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FIX COMPLETE!';
    RAISE NOTICE 'The "Total Previous Dues" should now show ₹% instead of the old value', v_total_old_due;
END $$;

-- STEP 5: Add a trigger to keep customers.old_due_amount in sync with active period
-- This prevents the issue from happening again
CREATE OR REPLACE FUNCTION sync_customer_old_due_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- When a period's old_due_amount changes and it's the active period
    -- Update the customer's old_due_amount to match
    IF NEW.is_active = true AND (OLD.old_due_amount IS DISTINCT FROM NEW.old_due_amount) THEN
        UPDATE customers
        SET old_due_amount = NEW.old_due_amount
        WHERE id = NEW.customer_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_customer_old_due ON customer_account_periods;

-- Create trigger
CREATE TRIGGER trigger_sync_customer_old_due
AFTER UPDATE OF old_due_amount, is_active ON customer_account_periods
FOR EACH ROW
EXECUTE FUNCTION sync_customer_old_due_amount();

-- STEP 6: Add constraint to ensure consistency
-- Create a function to validate old_due_amount matches active period
CREATE OR REPLACE FUNCTION validate_customer_old_due_amount()
RETURNS TABLE (
    customer_id uuid,
    customer_name text,
    customer_old_due numeric,
    active_period_old_due numeric,
    is_consistent boolean
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.old_due_amount as customer_old_due,
        coalesce(cap.old_due_amount, 0) as active_period_old_due,
        c.old_due_amount = coalesce(cap.old_due_amount, 0) as is_consistent
    FROM customers c
    LEFT JOIN customer_account_periods cap 
        ON cap.customer_id = c.id AND cap.is_active = true
    ORDER BY c.name;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_customer_old_due_amount TO authenticated;

COMMENT ON FUNCTION validate_customer_old_due_amount IS 
'Validates that customers.old_due_amount matches their active period''s old_due_amount. 
Use this to check for inconsistencies: SELECT * FROM validate_customer_old_due_amount() WHERE NOT is_consistent;';

-- STEP 7: Final verification query
SELECT 
    'Fix applied successfully!' as status,
    sum(c.old_due_amount) as total_old_due_amount,
    count(*) as total_customers,
    count(*) FILTER (WHERE c.old_due_amount > 0) as customers_with_old_due
FROM customers c;

-- Show any remaining inconsistencies (should be 0)
SELECT 
    'Remaining inconsistencies:' as status,
    count(*) as count
FROM validate_customer_old_due_amount()
WHERE NOT is_consistent;
