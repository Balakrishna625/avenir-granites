-- Restore Mahalakshmi's Data and Simplify Settlement System
-- This script will:
-- 1. Clean up any duplicate or incorrect periods for Mahalakshmi
-- 2. Keep settlement history feature but remove reverse functionality
-- 3. Ensure she has ONE active period with correct data

-- STEP 1: Find Mahalakshmi's customer ID
-- You'll need to check this first in your Supabase dashboard
-- SELECT id, name FROM customers WHERE name ILIKE '%mahalakshmi%';

-- STEP 2: Clean up periods (replace CUSTOMER_ID_HERE with actual ID)
-- This will delete any extra periods and keep only the most recent active one
/*
DO $$
DECLARE
  v_customer_id uuid := 'CUSTOMER_ID_HERE'; -- REPLACE WITH ACTUAL ID
  v_active_period_id uuid;
BEGIN
  -- Get the current active period
  SELECT id INTO v_active_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = true
  ORDER BY period_number DESC
  LIMIT 1;
  
  -- If multiple active periods exist, keep only the latest
  UPDATE customer_account_periods
  SET is_active = false
  WHERE customer_id = v_customer_id
    AND is_active = true
    AND id != v_active_period_id;
    
  -- Delete any settled periods that were created incorrectly today
  DELETE FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = false
    AND settlement_date >= CURRENT_DATE;
END $$;
*/

-- STEP 3: Reset customer's old_due_amount to 0 (fresh start)
-- UPDATE customers SET old_due_amount = 0 WHERE name ILIKE '%mahalakshmi%';

-- STEP 4: Update settle_customer_account to simplified version (no reverse needed)
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
  
  -- Get old due and waived amount from the period
  SELECT 
    coalesce(old_due_amount, 0),
    coalesce(waived_amount, 0)
  INTO v_old_due, v_waived
  FROM customer_account_periods
  WHERE id = v_current_period_id;
  
  v_total_pending := v_total_invoiced - v_total_received + v_old_due - v_waived;
  
  -- Calculate what's carried forward to next period
  IF p_waive_remaining THEN
    -- Waiving everything remaining
    v_waived := v_waived + (v_total_pending - p_settlement_amount);
    v_carried_forward := 0;
  ELSE
    -- Carrying forward any remaining balance
    v_carried_forward := greatest(v_total_pending - p_settlement_amount, 0);
  END IF;
  
  -- Update current period with settlement details
  UPDATE customer_account_periods
  SET 
    end_date = CURRENT_DATE,
    settlement_date = CURRENT_DATE,
    total_invoiced = v_total_invoiced,
    total_received = v_total_received + p_settlement_amount,
    total_pending = v_carried_forward,
    old_due_amount = v_old_due,
    waived_amount = v_waived,
    settlement_amount = p_settlement_amount,
    settlement_mode = p_settlement_mode,
    settlement_reference = p_settlement_reference,
    settlement_notes = p_settlement_notes,
    settled_by = p_settled_by,
    is_active = false
  WHERE id = v_current_period_id;
  
  -- Update the customer's old_due_amount to the carried forward amount
  UPDATE customers
  SET old_due_amount = v_carried_forward
  WHERE id = p_customer_id;
  
  -- Create new active period starting fresh
  INSERT INTO customer_account_periods (
    customer_id,
    period_number,
    start_date,
    is_active,
    old_due_amount
  )
  SELECT 
    p_customer_id,
    coalesce(max(period_number), 0) + 1,
    CURRENT_DATE,
    true,
    v_carried_forward
  FROM customer_account_periods
  WHERE customer_id = p_customer_id;
  
  -- Return settlement summary
  v_result := jsonb_build_object(
    'success', true,
    'settled_period_id', v_current_period_id,
    'settlement_amount', p_settlement_amount,
    'waived_amount', v_waived,
    'carried_forward', v_carried_forward
  );
  
  RETURN v_result;
END;
$$;

-- STEP 5: Drop the reverse and edit functions (not needed)
DROP FUNCTION IF EXISTS reverse_settlement(uuid, text);
DROP FUNCTION IF EXISTS edit_settlement(uuid, numeric, text, text, text, text);

COMMENT ON FUNCTION settle_customer_account IS 'Settle customer account - creates historical record and starts fresh period';
