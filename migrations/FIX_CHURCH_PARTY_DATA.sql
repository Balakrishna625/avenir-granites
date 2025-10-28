-- ============================================================================
-- FIX: Correct Church Party's wrong settlement data
-- ============================================================================
-- This fixes the Church Party account that has wrong carried forward amount
-- Run this AFTER running FIX_SETTLEMENT_AUTO_CALCULATE.sql
-- ============================================================================

-- Step 1: Find Church Party customer ID and period IDs
DO $$
DECLARE
  v_customer_id uuid;
  v_old_period_id uuid;
  v_new_period_id uuid;
BEGIN
  -- Get Church Party customer ID
  SELECT id INTO v_customer_id
  FROM customers
  WHERE name ILIKE '%church%'
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    RAISE NOTICE 'Church Party customer not found';
    RETURN;
  END IF;
  
  -- Get the periods
  SELECT id INTO v_old_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = false
  ORDER BY period_number DESC
  LIMIT 1;
  
  SELECT id INTO v_new_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = true
  LIMIT 1;
  
  RAISE NOTICE 'Church Party ID: %', v_customer_id;
  RAISE NOTICE 'Old Period ID: %', v_old_period_id;
  RAISE NOTICE 'New Period ID: %', v_new_period_id;
  
  -- If there's a settled period with wrong data, fix it
  IF v_old_period_id IS NOT NULL THEN
    -- Update the settled period to show it was fully paid
    UPDATE customer_account_periods
    SET 
      total_pending = 0,
      settlement_amount = 0,  -- No additional payment needed at settlement
      settlement_notes = 'Fully paid through transactions - Auto-corrected'
    WHERE id = v_old_period_id;
    
    RAISE NOTICE 'Updated settled period to show fully paid';
  END IF;
  
  -- Fix customer record - set old_due to 0
  UPDATE customers
  SET old_due_amount = 0
  WHERE id = v_customer_id;
  
  RAISE NOTICE 'Reset customer old_due_amount to 0';
  
  -- If new period exists, update it
  IF v_new_period_id IS NOT NULL THEN
    UPDATE customer_account_periods
    SET old_due_amount = 0
    WHERE id = v_new_period_id;
    
    RAISE NOTICE 'Reset new period old_due_amount to 0';
  END IF;
  
  RAISE NOTICE '✅ Church Party account corrected!';
END $$;
