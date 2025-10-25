-- Fix Settlement to Reset Customer's waived_amount Field
-- 
-- PROBLEM: When settling a customer account, the customers.waived_amount field
-- is NOT being reset to 0, causing the UI to still show waivers after settlement.
-- The waived amount should be recorded in the settlement history (customer_account_periods)
-- and the customer's waived_amount field should be reset to 0 for the new period.

-- SOLUTION: Update settle_customer_account function to reset customers.waived_amount

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
  
  -- Update current period with settlement details (includes all waivers)
  UPDATE customer_account_periods
  SET 
    end_date = CURRENT_DATE,
    settlement_date = CURRENT_DATE,
    total_invoiced = v_total_invoiced,
    total_received = v_total_received + p_settlement_amount,
    total_pending = v_carried_forward,
    old_due_amount = v_old_due,
    waived_amount = v_waived, -- Total waived (period + customer)
    settlement_amount = p_settlement_amount,
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

-- Verification Queries (run after applying migration):
-- 
-- 1. Check Dinakar Garu's current state:
-- SELECT id, name, waived_amount, old_due_amount 
-- FROM customers 
-- WHERE name ILIKE '%Dinakar%Guntur%';
-- 
-- 2. Check his settlement history:
-- SELECT * FROM customer_account_periods 
-- WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%Dinakar%Guntur%')
-- ORDER BY period_number DESC;
-- 
-- 3. Check waived transactions (preserved):
-- SELECT * FROM waived_transactions 
-- WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%Dinakar%Guntur%')
-- ORDER BY created_at DESC;
