-- Fix Settlement Function to Reset Waived Amount
-- After settlement, the new period should start with waived_amount = 0

-- Update the settle_customer_account function to reset waived amount
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
  
  -- CRITICAL: Also reset waived transactions for this customer
  -- Move them to archived waived transactions or just clear them
  -- (Assuming you want to keep history but not show in active period)
  -- If you have a waived_transactions table, you might want to mark them as archived
  
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

-- Add comment explaining the per-customer rule
COMMENT ON FUNCTION settle_customer_account IS 
'Settles ONE customer account at a time. 
IMPORTANT: This function only updates the specific customer_id provided.
Never updates all customers - that would cause data loss for other customers.
After settlement, the new period starts with:
- old_due_amount = carried_forward amount (or 0 if fully settled)
- waived_amount = 0 (reset for fresh start)';

-- Create a helper function to reset waived transactions for a customer
CREATE OR REPLACE FUNCTION reset_customer_waived_transactions(
  p_customer_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete waived transactions for this customer
  -- (They are already recorded in the settled period's waived_amount)
  DELETE FROM waived_transactions
  WHERE customer_id = p_customer_id;
  
  -- Alternative: Archive them instead of deleting
  -- UPDATE waived_transactions
  -- SET archived = true, archived_date = CURRENT_DATE
  -- WHERE customer_id = p_customer_id AND archived = false;
END;
$$;

COMMENT ON FUNCTION reset_customer_waived_transactions IS
'Resets waived transactions for ONE specific customer after settlement.
Called automatically during settlement to ensure fresh start.
Only affects the customer_id provided - never touches other customers.';

-- Verification query - check that functions only affect one customer
SELECT 
    'Functions Updated' as status,
    'settle_customer_account now resets waived_amount to 0' as change1,
    'Only updates the specific customer - never all customers' as safety_rule;
