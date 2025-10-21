-- LONG-TERM FIX: Update settlement function to automatically clear waived transactions
-- This ensures ALL future settlements will clear waived transactions properly

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
    is_active = false,
    carried_forward = v_carried_forward
  WHERE id = v_current_period_id;
  
  -- CRITICAL: Update ONLY THIS CUSTOMER's old_due_amount (NOT all customers!)
  UPDATE customers
  SET old_due_amount = v_carried_forward
  WHERE id = p_customer_id;
  
  -- ✅ NEW: Delete waived transactions for THIS customer after settlement
  -- The waived amount is already recorded in the settled period's waived_amount column
  -- So we can safely clear the waived_transactions table for this customer
  DELETE FROM waived_transactions
  WHERE customer_id = p_customer_id;
  
  -- Create new active period starting fresh with ZERO waived amount
  INSERT INTO customer_account_periods (
    customer_id,
    period_number,
    start_date,
    is_active,
    old_due_amount,
    waived_amount  -- Start with 0 waived amount
  )
  SELECT 
    p_customer_id,
    coalesce(max(period_number), 0) + 1,
    CURRENT_DATE,
    true,
    v_carried_forward,
    0  -- RESET waived amount to 0 for fresh start
  FROM customer_account_periods
  WHERE customer_id = p_customer_id;
  
  -- Return settlement summary
  v_result := jsonb_build_object(
    'success', true,
    'settled_period_id', v_current_period_id,
    'settlement_amount', p_settlement_amount,
    'waived_amount', v_waived,
    'carried_forward', v_carried_forward,
    'customer_id', p_customer_id  -- For verification
  );
  
  return v_result;
END;
$$;

-- Update comment explaining the behavior
COMMENT ON FUNCTION settle_customer_account IS 
'Settles ONE customer account at a time. 
IMPORTANT: This function only updates the specific customer_id provided.
Never updates all customers - that would cause data loss for other customers.

After settlement, this function:
1. Closes the current period and records all financial data
2. Updates ONLY THIS customer''s old_due_amount (not all customers)
3. Deletes waived_transactions for this customer (amounts already saved in period)
4. Creates new period with:
   - old_due_amount = carried_forward amount (or 0 if fully settled)
   - waived_amount = 0 (reset for fresh start)
   
This ensures a complete fresh start for the new period.';

-- Verification
SELECT 
    'Settlement function updated' as status,
    'Now automatically deletes waived_transactions after settlement' as change,
    'Only affects the specific customer being settled' as safety_rule;
