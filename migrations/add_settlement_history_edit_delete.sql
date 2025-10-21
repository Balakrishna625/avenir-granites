-- Add ability to Edit and Delete Settlement History Records
-- This is for correcting mistakes in settlement history, NOT for reversing settlements
-- Users can fix incorrect values or delete wrong historical records

-- STEP 1: Function to update/edit settlement history values
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

-- STEP 2: Function to delete settlement history record
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

-- STEP 3: Grant permissions
GRANT EXECUTE ON FUNCTION edit_settlement_history TO authenticated;
GRANT EXECUTE ON FUNCTION delete_settlement_history TO authenticated;

-- STEP 4: Add helpful comments
COMMENT ON FUNCTION edit_settlement_history IS 
'Edit/update settlement history values to correct mistakes. 
Only historical (inactive) periods can be edited. Pass NULL for fields you don''t want to change.
Example: SELECT edit_settlement_history(period_id, total_invoiced := 50000, waived_amount := 5000);';

COMMENT ON FUNCTION delete_settlement_history IS 
'Delete a settlement history record permanently. 
Only historical (inactive) periods can be deleted, and only if there are no later settlements after it.
This is for removing incorrect records, NOT for reversing settlements.
Example: SELECT delete_settlement_history(''period-uuid-here'');';

-- STEP 5: Verification queries
-- Show all settlement history records
SELECT 
    cap.id as period_id,
    c.name as customer_name,
    cap.period_number,
    cap.start_date,
    cap.end_date,
    cap.settlement_date,
    cap.total_invoiced,
    cap.total_received,
    cap.total_pending,
    cap.old_due_amount,
    cap.waived_amount,
    cap.settlement_amount,
    cap.settlement_mode,
    cap.is_active
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE cap.is_active = false
ORDER BY cap.settlement_date DESC;

-- Success message
SELECT 
    'Migration complete!' as status,
    'You can now edit and delete settlement history records' as message;
