-- ============================================================================
-- FINAL SETTLEMENT FIX - COMPLETE DATABASE FUNCTION UPDATE
-- ============================================================================
-- This updates the settle_customer_account function to:
-- 1. Reset customer.waived_amount to 0 (fresh start)
-- 2. DELETE waived_transactions for the customer (cleanup)
-- 3. Record settlement properly without double-counting
--
-- SAFE TO RUN: Only updates the function, doesn't touch existing data
-- RUN THIS IN SUPABASE SQL EDITOR
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
  -- FIX: Use separate queries to avoid cartesian product duplication
  SELECT coalesce(sum(total), 0)
  INTO v_total_invoiced
  FROM consignments
  WHERE period_id = v_current_period_id;
  
  SELECT coalesce(sum(amount), 0)
  INTO v_total_received
  FROM transactions
  WHERE period_id = v_current_period_id;
  
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
  
  -- *** FIX 1: Reset customer's waived_amount to 0 (fresh start) ***
  -- And set old_due_amount to the carried forward amount
  UPDATE customers
  SET 
    old_due_amount = v_carried_forward,
    waived_amount = 0 -- RESET to 0 for new period
  WHERE id = p_customer_id;
  
  -- *** FIX 2: Delete waived_transactions for THIS customer after settlement ***
  -- The waived amount is already recorded in the settled period's waived_amount column
  -- So we can safely clear the waived_transactions table for this customer to start fresh
  DELETE FROM waived_transactions
  WHERE customer_id = p_customer_id;
  
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION settle_customer_account TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION settle_customer_account IS 
'Settles a customer account by closing the current period and starting a new one.
This function:
- Records settlement amount in settlement_amount field (NOT as transaction)
- Resets customer.waived_amount to 0 for fresh start
- Deletes all waived_transactions for the customer
- Carries forward any remaining balance to new period
- Does NOT create duplicate transaction records';
