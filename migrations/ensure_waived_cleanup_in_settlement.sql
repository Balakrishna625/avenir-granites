-- ============================================================================
-- VERIFY AND UPDATE SETTLE_CUSTOMER_ACCOUNT FUNCTION
-- ============================================================================
-- This ensures the settle_customer_account function properly cleans up
-- waived_transactions after settlement to prevent them from showing in
-- the customer summary page.
-- ============================================================================

-- Check if the function exists and view its definition
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'settle_customer_account';

-- If the function doesn't have the DELETE waived_transactions line,
-- update it with this complete version:

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
  
  -- Calculate current financials
  SELECT 
    coalesce(sum(c.total), 0) AS total_invoiced,
    coalesce(sum(t.amount), 0) AS total_received
  INTO v_total_invoiced, v_total_received
  FROM customer_account_periods cap
  LEFT JOIN consignments c ON c.customer_id = cap.customer_id 
    AND c.date >= cap.start_date 
    AND (cap.end_date IS NULL OR c.date <= cap.end_date)
  LEFT JOIN transactions t ON t.customer_id = cap.customer_id 
    AND t.date >= cap.start_date 
    AND (cap.end_date IS NULL OR t.date <= cap.end_date)
  WHERE cap.id = v_current_period_id
  GROUP BY cap.id;
  
  -- Get old due and waived amounts
  SELECT 
    cap.old_due_amount,
    coalesce(sum(wt.amount), 0)
  INTO v_old_due, v_waived
  FROM customer_account_periods cap
  LEFT JOIN waived_transactions wt ON wt.customer_id = cap.customer_id
  WHERE cap.id = v_current_period_id
  GROUP BY cap.id, cap.old_due_amount;
  
  SELECT coalesce(waived_amount, 0)
  INTO v_customer_waived
  FROM customers
  WHERE id = p_customer_id;
  
  v_total_pending := v_total_invoiced + v_old_due - v_total_received - v_waived;
  
  -- Handle waive_remaining
  IF p_waive_remaining THEN
    v_waived := v_waived + v_total_pending;
    v_total_pending := 0;
  END IF;
  
  -- Calculate carried forward
  v_carried_forward := GREATEST(0, v_total_pending - p_settlement_amount);
  
  -- Close current period
  UPDATE customer_account_periods
  SET 
    end_date = CURRENT_DATE,
    is_active = false,
    total_invoiced = v_total_invoiced,
    total_received = v_total_received,
    total_pending = v_total_pending,
    old_due_amount = v_old_due,
    waived_amount = v_waived,
    settlement_amount = p_settlement_amount,
    settlement_mode = p_settlement_mode,
    settlement_date = CURRENT_DATE,
    settlement_reference = p_settlement_reference,
    settlement_notes = p_settlement_notes,
    carried_forward = v_carried_forward,
    settled_by = p_settled_by
  WHERE id = v_current_period_id;
  
  -- *** CRITICAL FIX: Delete waived_transactions after settlement ***
  -- The waived amount is already recorded in the settled period's waived_amount column
  DELETE FROM waived_transactions
  WHERE customer_id = p_customer_id;
  
  -- Reset customer waived_amount to 0
  UPDATE customers
  SET 
    old_due_amount = v_carried_forward,
    waived_amount = 0
  WHERE id = p_customer_id;
  
  -- Create new active period
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
  
  v_result := jsonb_build_object(
    'success', true,
    'period_id', v_current_period_id,
    'total_invoiced', v_total_invoiced,
    'total_received', v_total_received,
    'waived_amount', v_waived,
    'settlement_amount', p_settlement_amount,
    'carried_forward', v_carried_forward
  );
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION settle_customer_account TO authenticated;

-- Add comment
COMMENT ON FUNCTION settle_customer_account IS 
'Settles customer account, records period history, cleans up waived_transactions, and starts fresh period';
