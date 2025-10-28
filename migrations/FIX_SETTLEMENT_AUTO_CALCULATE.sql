-- ============================================================================
-- FIX: Auto-calculate settlement - don't carry forward if fully paid
-- ============================================================================
-- This fixes the settlement function to:
-- 1. Automatically detect when invoices = transactions (fully paid)
-- 2. Set carried_forward to 0 if balance is paid through transactions
-- 3. Only carry forward actual unpaid amounts
-- 4. Settlement payment field is for ADDITIONAL payment at settlement time
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
  v_customer_waived numeric;
  v_carried_forward numeric;
  v_actual_pending numeric;  -- NEW: Actual amount pending after transactions
  v_result jsonb;
BEGIN
  -- Get current active period
  SELECT id INTO v_current_period_id
  FROM customer_account_periods
  WHERE customer_id = p_customer_id
    AND is_active = true
  LIMIT 1;
  
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
  
  -- Get customer's current waived amount
  SELECT coalesce(waived_amount, 0)
  INTO v_customer_waived
  FROM customers
  WHERE id = p_customer_id;
  
  -- Total waived is period waived + customer waived
  v_waived := v_waived + v_customer_waived;
  
  -- Calculate ACTUAL pending amount (before settlement payment)
  v_actual_pending := v_total_invoiced - v_total_received + v_old_due - v_waived;
  
  -- FIX: If actual pending is already 0 or negative (fully paid), don't carry forward
  -- Settlement payment is for ADDITIONAL payment at settlement time only
  IF v_actual_pending <= 0 THEN
    -- Already fully paid through transactions
    v_carried_forward := 0;
    v_total_pending := 0;
  ELSIF p_waive_remaining THEN
    -- Waiving everything remaining after settlement payment
    v_waived := v_waived + (v_actual_pending - p_settlement_amount);
    v_carried_forward := 0;
    v_total_pending := 0;
  ELSE
    -- Calculate carried forward: actual pending - settlement payment
    v_carried_forward := greatest(v_actual_pending - p_settlement_amount, 0);
    v_total_pending := v_carried_forward;
  END IF;
  
  -- Update current period with settlement details
  UPDATE customer_account_periods
  SET 
    end_date = CURRENT_DATE,
    settlement_date = CURRENT_DATE,
    total_invoiced = v_total_invoiced,
    total_received = v_total_received,
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
  
  -- Reset customer's waived_amount to 0 and set carried forward
  UPDATE customers
  SET 
    old_due_amount = v_carried_forward,
    waived_amount = 0
  WHERE id = p_customer_id;
  
  -- Delete waived_transactions for fresh start
  DELETE FROM waived_transactions
  WHERE customer_id = p_customer_id;
  
  -- Create new active period starting fresh
  INSERT INTO customer_account_periods (
    customer_id,
    period_number,
    start_date,
    is_active,
    old_due_amount,
    waived_amount
  )
  SELECT 
    p_customer_id,
    coalesce(max(period_number), 0) + 1,
    CURRENT_DATE,
    true,
    v_carried_forward,
    0
  FROM customer_account_periods
  WHERE customer_id = p_customer_id;
  
  -- Return settlement summary
  v_result := jsonb_build_object(
    'success', true,
    'settled_period_id', v_current_period_id,
    'settlement_amount', p_settlement_amount,
    'total_waived', v_waived,
    'carried_forward', v_carried_forward,
    'was_fully_paid', v_actual_pending <= 0
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION settle_customer_account TO authenticated;

COMMENT ON FUNCTION settle_customer_account IS 
'Settles a customer account by closing the current period and starting a new one.
SMART BEHAVIOR:
- If invoices = transactions (fully paid), automatically carries forward 0
- Settlement payment is for ADDITIONAL payment at settlement time only
- Resets customer.waived_amount to 0 for fresh start
- Deletes all waived_transactions for the customer
- Only carries forward actual unpaid amounts';
