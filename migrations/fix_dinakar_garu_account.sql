-- Manual Fix for Dinakar Garu (Guntur) Account After Incorrect Settlement
-- 
-- PROBLEM: Settlement was performed but didn't clear waived_amount, 
-- leaving account in confusing partial state
--
-- SOLUTION: This script will manually correct Dinakar Garu's account

-- STEP 1: First, verify customer details
-- SELECT id, name, waived_amount, old_due_amount 
-- FROM customers 
-- WHERE name ILIKE '%Dinakar%Guntur%';

-- STEP 2: Check current active period
-- SELECT * FROM customer_account_periods 
-- WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%Dinakar%Guntur%')
-- ORDER BY period_number DESC
-- LIMIT 2;

-- STEP 3: Check waived transactions (should be preserved)
-- SELECT * FROM waived_transactions 
-- WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%Dinakar%Guntur%')
-- ORDER BY created_at DESC;

-- ============================================================================
-- IMPORTANT: Before running the fix below, you need to:
-- 1. Run the queries above to see current state
-- 2. Determine the correct settlement that should have happened
-- 3. Update the values in the DO block below
-- ============================================================================

/*
DO $$
DECLARE
  v_customer_id uuid;
  v_settled_period_id uuid;
  v_active_period_id uuid;
BEGIN
  -- Get Dinakar Garu's customer ID
  SELECT id INTO v_customer_id
  FROM customers 
  WHERE name ILIKE '%Dinakar%Guntur%';
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found: Dinakar Garu (Guntur)';
  END IF;
  
  RAISE NOTICE 'Found customer: %', v_customer_id;
  
  -- Get the most recent settled period (the one that was incorrectly settled)
  SELECT id INTO v_settled_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = false
  ORDER BY period_number DESC
  LIMIT 1;
  
  -- Get current active period
  SELECT id INTO v_active_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = true
  LIMIT 1;
  
  RAISE NOTICE 'Settled period: %, Active period: %', v_settled_period_id, v_active_period_id;
  
  -- Fix the settled period to include the waived amount in its record
  -- UPDATE this with actual values after checking the data
  UPDATE customer_account_periods
  SET 
    waived_amount = 4000, -- The ₹4,000 that was waived
    settlement_notes = COALESCE(settlement_notes, '') || 
                      E'\n[Auto-corrected: Added waived amount to settlement record]'
  WHERE id = v_settled_period_id;
  
  -- Reset customer's waived_amount to 0 (should be in history now)
  UPDATE customers
  SET 
    waived_amount = 0,
    old_due_amount = 0 -- Assuming full settlement, adjust if needed
  WHERE id = v_customer_id;
  
  -- Fix the new active period to start clean
  UPDATE customer_account_periods
  SET 
    waived_amount = 0,
    old_due_amount = 0 -- Adjust if there's a carried forward amount
  WHERE id = v_active_period_id;
  
  RAISE NOTICE 'Successfully fixed Dinakar Garu account';
  
END $$;
*/

-- ============================================================================
-- ALTERNATIVE: If you want to completely re-settle the account properly
-- ============================================================================
-- This approach will:
-- 1. Delete the incorrect settlement
-- 2. Merge the periods back
-- 3. Re-run settlement with the correct function (after applying the fix)

/*
DO $$
DECLARE
  v_customer_id uuid;
  v_settled_period_id uuid;
  v_active_period_id uuid;
BEGIN
  -- Get customer ID
  SELECT id INTO v_customer_id
  FROM customers 
  WHERE name ILIKE '%Dinakar%Guntur%';
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found: Dinakar Garu (Guntur)';
  END IF;
  
  -- Get the incorrectly settled period
  SELECT id INTO v_settled_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = false
    AND settlement_date >= CURRENT_DATE -- Today's incorrect settlement
  ORDER BY period_number DESC
  LIMIT 1;
  
  -- Get the new active period that was created
  SELECT id INTO v_active_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = true
  LIMIT 1;
  
  -- Move any consignments/transactions back from new period to old period
  UPDATE consignments
  SET period_id = v_settled_period_id
  WHERE period_id = v_active_period_id;
  
  UPDATE transactions
  SET period_id = v_settled_period_id
  WHERE period_id = v_active_period_id;
  
  -- Delete the new active period
  DELETE FROM customer_account_periods
  WHERE id = v_active_period_id;
  
  -- Reactivate the old period
  UPDATE customer_account_periods
  SET 
    is_active = true,
    end_date = NULL,
    settlement_date = NULL,
    settlement_amount = NULL,
    settlement_mode = NULL,
    settlement_reference = NULL,
    settlement_notes = NULL,
    settled_by = NULL
  WHERE id = v_settled_period_id;
  
  -- Reset customer's values to pre-settlement state
  -- YOU NEED TO FILL IN THE CORRECT VALUES HERE
  UPDATE customers
  SET 
    waived_amount = 4000, -- The ₹4,000 waiver
    old_due_amount = 0 -- Adjust if needed
  WHERE id = v_customer_id;
  
  RAISE NOTICE 'Successfully reversed incorrect settlement for Dinakar Garu';
  RAISE NOTICE 'Now you can use the UI to settle properly with the fixed function';
  
END $$;
*/

-- ============================================================================
-- SAFEST APPROACH: Just fix the fields without reversing
-- ============================================================================
-- Run this AFTER applying fix_settlement_reset_customer_waived_amount.sql

DO $$
DECLARE
  v_customer_id uuid;
  v_customer_name text;
  v_current_waived numeric;
  v_settled_period_id uuid;
BEGIN
  -- Get customer details
  SELECT id, name, waived_amount 
  INTO v_customer_id, v_customer_name, v_current_waived
  FROM customers 
  WHERE name ILIKE '%Dinakar%Guntur%';
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found: Dinakar Garu (Guntur)';
  END IF;
  
  RAISE NOTICE 'Found customer: % (ID: %)', v_customer_name, v_customer_id;
  RAISE NOTICE 'Current waived_amount: %', v_current_waived;
  
  -- Get the most recently settled period
  SELECT id INTO v_settled_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = false
    AND settlement_date IS NOT NULL
  ORDER BY settlement_date DESC, period_number DESC
  LIMIT 1;
  
  IF v_settled_period_id IS NULL THEN
    RAISE NOTICE 'No settled period found - may not have been settled yet';
  ELSE
    RAISE NOTICE 'Found settled period: %', v_settled_period_id;
    
    -- Update settled period to include the waived amount if not already there
    UPDATE customer_account_periods
    SET 
      waived_amount = COALESCE(waived_amount, 0) + v_current_waived
    WHERE id = v_settled_period_id
      AND v_current_waived > 0;
  END IF;
  
  -- Reset customer's waived_amount to 0 (it's now in history)
  IF v_current_waived > 0 THEN
    UPDATE customers
    SET waived_amount = 0
    WHERE id = v_customer_id;
    
    RAISE NOTICE 'Reset customer waived_amount from % to 0', v_current_waived;
  ELSE
    RAISE NOTICE 'Customer waived_amount already 0, no fix needed';
  END IF;
  
  RAISE NOTICE 'Successfully fixed Dinakar Garu account!';
  
  -- Show the updated state
  RAISE NOTICE '=== Updated Customer State ===';
  RAISE NOTICE 'Run these queries to verify:';
  RAISE NOTICE 'SELECT waived_amount, old_due_amount FROM customers WHERE id = %', v_customer_id;
  RAISE NOTICE 'SELECT period_number, waived_amount, settlement_amount FROM customer_account_periods WHERE customer_id = % ORDER BY period_number DESC LIMIT 2', v_customer_id;
  
END $$;
