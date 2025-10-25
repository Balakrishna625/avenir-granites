-- ============================================================================
-- COMPLETE SETTLEMENT FIX - RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- ============================================================================
-- This file combines all necessary fixes:
-- 1. Creates edit_settlement_history and delete_settlement_history functions
-- 2. Fixes the settle_customer_account function to reset waived_amount
-- 3. Fixes Dinakar Garu's account
--
-- SAFE TO RUN: Only affects settlement functions and Dinakar Garu's account
-- ============================================================================

-- ============================================================================
-- PART 1: Create Edit and Delete Settlement History Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION edit_settlement_history(
  p_period_id uuid,
  p_total_invoiced numeric DEFAULT NULL,
  p_total_received numeric DEFAULT NULL,
  p_total_pending numeric DEFAULT NULL,
  p_old_due_amount numeric DEFAULT NULL,
  p_waived_amount numeric DEFAULT NULL,
  p_settlement_amount numeric DEFAULT NULL,
  p_settlement_mode text DEFAULT NULL,
  p_settlement_reference text DEFAULT NULL,
  p_settlement_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_period_exists boolean;
  v_is_active boolean;
BEGIN
  -- Check if period exists and is not active (can only edit inactive/historical periods)
  SELECT EXISTS(
    SELECT 1 
    FROM customer_account_periods 
    WHERE id = p_period_id
  ), COALESCE((
    SELECT is_active 
    FROM customer_account_periods 
    WHERE id = p_period_id
  ), false)
  INTO v_period_exists, v_is_active;
  
  IF NOT v_period_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Settlement period not found'
    );
  END IF;
  
  IF v_is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot edit active period. Only historical settlement records can be edited.'
    );
  END IF;
  
  -- Update only the provided fields (NULL means don't update that field)
  UPDATE customer_account_periods
  SET 
    total_invoiced = COALESCE(p_total_invoiced, total_invoiced),
    total_received = COALESCE(p_total_received, total_received),
    total_pending = COALESCE(p_total_pending, total_pending),
    old_due_amount = COALESCE(p_old_due_amount, old_due_amount),
    waived_amount = COALESCE(p_waived_amount, waived_amount),
    settlement_amount = COALESCE(p_settlement_amount, settlement_amount),
    settlement_mode = COALESCE(p_settlement_mode, settlement_mode),
    settlement_reference = COALESCE(p_settlement_reference, settlement_reference),
    settlement_notes = COALESCE(p_settlement_notes, settlement_notes)
  WHERE id = p_period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Settlement history updated successfully',
    'period_id', p_period_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION delete_settlement_history(
  p_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id uuid;
  v_is_active boolean;
  v_period_number int;
  v_has_later_periods boolean;
BEGIN
  -- Get period details
  SELECT 
    customer_id, 
    is_active,
    period_number
  INTO v_customer_id, v_is_active, v_period_number
  FROM customer_account_periods
  WHERE id = p_period_id;
  
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Settlement period not found'
    );
  END IF;
  
  IF v_is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete active period. Only historical settlement records can be deleted.'
    );
  END IF;
  
  -- Check if there are later periods (we should warn about this)
  SELECT EXISTS(
    SELECT 1
    FROM customer_account_periods
    WHERE customer_id = v_customer_id
      AND period_number > v_period_number
  ) INTO v_has_later_periods;
  
  IF v_has_later_periods THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete this settlement because there are later settlements after it. Delete the most recent settlements first.'
    );
  END IF;
  
  -- Delete the period record
  DELETE FROM customer_account_periods
  WHERE id = p_period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Settlement history deleted successfully',
    'period_id', p_period_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION edit_settlement_history TO authenticated;
GRANT EXECUTE ON FUNCTION delete_settlement_history TO authenticated;

COMMENT ON FUNCTION edit_settlement_history IS 
'Edit/update settlement history values to correct mistakes. 
Only historical (inactive) periods can be edited. Pass NULL for fields you don''t want to change.
Example: SELECT edit_settlement_history(period_id, total_invoiced := 50000, waived_amount := 5000);';

COMMENT ON FUNCTION delete_settlement_history IS 
'Delete a settlement history record permanently. 
Only historical (inactive) periods can be deleted, and only if there are no later settlements after it.
This is for removing incorrect records, NOT for reversing settlements.
Example: SELECT delete_settlement_history(''period-uuid-here'');';

-- ============================================================================
-- PART 2: Fix settle_customer_account to Reset waived_amount
-- ============================================================================

CREATE OR REPLACE FUNCTION settle_customer_account(
  p_customer_id uuid,
  p_settlement_amount numeric,
  p_settlement_mode text,
  p_settlement_reference text DEFAULT NULL,
  p_settlement_notes text DEFAULT NULL,
  p_waive_remaining boolean DEFAULT false,
  p_settled_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_period_id uuid;
  v_total_invoiced numeric;
  v_total_received numeric;
  v_total_pending numeric;
  v_old_due numeric;
  v_waived numeric;
  v_customer_waived numeric; -- Customer-level waived amount
  v_carried_forward numeric;
  v_result jsonb;
BEGIN
  -- Get current active period
  SELECT id INTO v_current_period_id
  FROM customer_account_periods
  WHERE customer_id = p_customer_id
    AND is_active = true
  LIMIT 1;
  
  -- If no active period, create one first
  IF v_current_period_id IS NULL THEN
    v_current_period_id := get_or_create_active_period(p_customer_id);
  END IF;
  
  -- Calculate current financials for this period
  SELECT 
    coalesce(sum(c.total), 0) AS total_invoiced,
    coalesce(sum(t.amount), 0) AS total_received
  INTO v_total_invoiced, v_total_received
  FROM customer_account_periods cap
  LEFT JOIN consignments c ON c.period_id = cap.id
  LEFT JOIN transactions t ON t.period_id = cap.id
  WHERE cap.id = v_current_period_id;
  
  -- Get old due and period waived amount
  SELECT 
    coalesce(old_due_amount, 0),
    coalesce(waived_amount, 0)
  INTO v_old_due, v_waived
  FROM customer_account_periods
  WHERE id = v_current_period_id;
  
  -- Get customer's current waived amount (this needs to be included in settlement)
  SELECT coalesce(waived_amount, 0)
  INTO v_customer_waived
  FROM customers
  WHERE id = p_customer_id;
  
  -- Total waived is period waived + customer waived
  v_waived := v_waived + v_customer_waived;
  
  -- Calculate actual pending amount (what's owed right now)
  v_total_pending := v_total_invoiced - v_total_received + v_old_due - v_waived;
  
  -- Calculate what's carried forward to next period
  IF p_waive_remaining THEN
    -- Waiving everything remaining after settlement payment
    v_waived := v_waived + (v_total_pending - p_settlement_amount);
    v_carried_forward := 0;
  ELSE
    -- Carrying forward any remaining balance
    v_carried_forward := greatest(v_total_pending - p_settlement_amount, 0);
  END IF;
  
  -- Update current period with settlement details
  -- IMPORTANT: 
  -- - total_received = transactions that were already recorded during the period
  -- - settlement_amount = final payment made during settlement (could be 0 if fully waived)
  -- - total_pending after settlement = carried forward amount (or 0 if fully settled)
  -- - DO NOT add settlement_amount to total_received (they are separate concepts)
  UPDATE customer_account_periods
  SET 
    end_date = CURRENT_DATE,
    settlement_date = CURRENT_DATE,
    total_invoiced = v_total_invoiced,
    total_received = v_total_received, -- Keep original transactions total
    total_pending = v_carried_forward, -- What's being carried forward
    old_due_amount = v_old_due,
    waived_amount = v_waived, -- Total waived (period + customer)
    settlement_amount = p_settlement_amount, -- Settlement payment amount
    settlement_mode = p_settlement_mode,
    settlement_reference = p_settlement_reference,
    settlement_notes = p_settlement_notes,
    settled_by = p_settled_by,
    is_active = false
  WHERE id = v_current_period_id;
  
  -- *** FIX: Reset customer's waived_amount to 0 (fresh start) ***
  -- And set old_due_amount to the carried forward amount
  UPDATE customers
  SET 
    old_due_amount = v_carried_forward,
    waived_amount = 0 -- RESET to 0 for new period
  WHERE id = p_customer_id;
  
  -- Create new active period starting fresh
  INSERT INTO customer_account_periods (
    customer_id,
    period_number,
    start_date,
    is_active,
    old_due_amount,
    waived_amount -- New period starts with 0 waivers
  )
  SELECT 
    p_customer_id,
    coalesce(max(period_number), 0) + 1,
    CURRENT_DATE,
    true,
    v_carried_forward,
    0 -- Start fresh with no waivers
  FROM customer_account_periods
  WHERE customer_id = p_customer_id;
  
  -- Return settlement summary
  v_result := jsonb_build_object(
    'success', true,
    'settled_period_id', v_current_period_id,
    'settlement_amount', p_settlement_amount,
    'total_waived', v_waived,
    'carried_forward', v_carried_forward
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION settle_customer_account IS 
'Settle customer account - resets waived_amount to 0, records all waivers in history, and starts fresh period';

-- ============================================================================
-- PART 3: Fix Dinakar Garu's Account (ONLY Dinakar Garu - SAFE)
-- ============================================================================

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
    RAISE NOTICE '❌ Customer not found: Dinakar Garu (Guntur) - SKIPPING';
    RAISE NOTICE 'This is OK if the customer name is different in your database';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found customer: % (ID: %)', v_customer_name, v_customer_id;
  RAISE NOTICE '📊 Current waived_amount: %', v_current_waived;
  
  -- Get the most recently settled period
  SELECT id INTO v_settled_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = false
    AND settlement_date IS NOT NULL
  ORDER BY settlement_date DESC, period_number DESC
  LIMIT 1;
  
  IF v_settled_period_id IS NULL THEN
    RAISE NOTICE '⚠️  No settled period found - may not have been settled yet';
  ELSE
    RAISE NOTICE '✅ Found settled period: %', v_settled_period_id;
    
    -- Update settled period to include the waived amount if not already there
    UPDATE customer_account_periods
    SET 
      waived_amount = COALESCE(waived_amount, 0) + v_current_waived
    WHERE id = v_settled_period_id
      AND v_current_waived > 0;
      
    IF v_current_waived > 0 THEN
      RAISE NOTICE '✅ Updated settled period waived_amount by adding %', v_current_waived;
    END IF;
  END IF;
  
  -- Reset customer's waived_amount to 0 (it's now in history)
  IF v_current_waived > 0 THEN
    UPDATE customers
    SET waived_amount = 0
    WHERE id = v_customer_id;
    
    RAISE NOTICE '✅ Reset customer waived_amount from % to 0', v_current_waived;
  ELSE
    RAISE NOTICE '✅ Customer waived_amount already 0, no fix needed';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Successfully fixed Dinakar Garu account!';
  RAISE NOTICE '';
  RAISE NOTICE '=== Verification Queries ===';
  RAISE NOTICE 'Run these to verify:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Check customer state:';
  RAISE NOTICE 'SELECT name, waived_amount, old_due_amount FROM customers WHERE id = ''%'';', v_customer_id;
  RAISE NOTICE '';
  RAISE NOTICE '2. Check settlement history:';
  RAISE NOTICE 'SELECT period_number, waived_amount, settlement_amount, settlement_date FROM customer_account_periods WHERE customer_id = ''%'' ORDER BY period_number DESC LIMIT 2;', v_customer_id;
  
END $$;

-- ============================================================================
-- DONE! Summary of what was applied:
-- ============================================================================
-- ✅ Created edit_settlement_history function - you can now edit historical settlements
-- ✅ Created delete_settlement_history function - you can delete incorrect historical records
-- ✅ Fixed settle_customer_account function - future settlements will reset waived_amount correctly
-- ✅ Fixed Dinakar Garu's account - moved waived_amount to settlement history
--
-- OTHER CUSTOMERS: NOT AFFECTED - Only functions updated and Dinakar Garu's account fixed
-- ============================================================================
