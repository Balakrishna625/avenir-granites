-- Fix ALL Customers' Settlement History - Auto-Calculate Correct Values
-- 
-- This script will automatically fix settlement history for ALL customers
-- by recalculating the correct values based on actual consignments and transactions
--
-- SAFE: Only updates settlement history periods, doesn't touch active periods

DO $$
DECLARE
  v_period record;
  v_actual_invoiced numeric;
  v_actual_received numeric;
  v_correct_pending numeric;
  v_customer_name text;
  v_fixed_count int := 0;
BEGIN
  RAISE NOTICE '🔍 Scanning all settled periods for incorrect values...';
  RAISE NOTICE '';
  
  -- Loop through all SETTLED (inactive) periods
  FOR v_period IN 
    SELECT 
      cap.id as period_id,
      cap.customer_id,
      cap.period_number,
      cap.total_invoiced,
      cap.total_received,
      cap.total_pending,
      cap.old_due_amount,
      cap.waived_amount,
      cap.settlement_amount,
      c.name as customer_name
    FROM customer_account_periods cap
    JOIN customers c ON c.id = cap.customer_id
    WHERE cap.is_active = false
      AND cap.settlement_date IS NOT NULL
    ORDER BY c.name, cap.period_number
  LOOP
    -- Calculate ACTUAL values from consignments and transactions
    SELECT 
      COALESCE(SUM(cons.total), 0)
    INTO v_actual_invoiced
    FROM consignments cons
    WHERE cons.period_id = v_period.period_id;
    
    SELECT 
      COALESCE(SUM(trans.amount), 0)
    INTO v_actual_received
    FROM transactions trans
    WHERE trans.period_id = v_period.period_id;
    
    -- Calculate correct pending: Invoiced - Received + Old Due - Waived
    v_correct_pending := v_actual_invoiced - v_actual_received + 
                         COALESCE(v_period.old_due_amount, 0) - 
                         COALESCE(v_period.waived_amount, 0);
    
    -- If there's a mismatch, fix it
    IF v_period.total_invoiced != v_actual_invoiced OR 
       v_period.total_received != v_actual_received OR
       v_period.total_pending != v_correct_pending THEN
      
      RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
      RAISE NOTICE '🔧 Fixing: % - Period #%', v_period.customer_name, v_period.period_number;
      RAISE NOTICE '';
      RAISE NOTICE '❌ BEFORE (Incorrect):';
      RAISE NOTICE '   Total Invoiced:  ₹% (stored: ₹%)', v_actual_invoiced, v_period.total_invoiced;
      RAISE NOTICE '   Total Received:  ₹% (stored: ₹%)', v_actual_received, v_period.total_received;
      RAISE NOTICE '   Total Pending:   ₹% (stored: ₹%)', v_correct_pending, v_period.total_pending;
      
      -- Update with correct values
      UPDATE customer_account_periods
      SET 
        total_invoiced = v_actual_invoiced,
        total_received = v_actual_received,
        total_pending = v_correct_pending
      WHERE id = v_period.period_id;
      
      RAISE NOTICE '';
      RAISE NOTICE '✅ AFTER (Corrected):';
      RAISE NOTICE '   Total Invoiced:  ₹%', v_actual_invoiced;
      RAISE NOTICE '   Total Received:  ₹%', v_actual_received;
      RAISE NOTICE '   Total Pending:   ₹%', v_correct_pending;
      RAISE NOTICE '   Old Due:         ₹%', COALESCE(v_period.old_due_amount, 0);
      RAISE NOTICE '   Waived:          ₹%', COALESCE(v_period.waived_amount, 0);
      RAISE NOTICE '';
      RAISE NOTICE '📊 Math Check:';
      RAISE NOTICE '   ₹% (invoiced) - ₹% (received) + ₹% (old due) - ₹% (waived) = ₹%',
        v_actual_invoiced, v_actual_received, 
        COALESCE(v_period.old_due_amount, 0),
        COALESCE(v_period.waived_amount, 0),
        v_correct_pending;
      
      v_fixed_count := v_fixed_count + 1;
    ELSE
      RAISE NOTICE '✅ OK: % - Period #% (values already correct)', 
        v_period.customer_name, v_period.period_number;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SUMMARY';
  RAISE NOTICE '   Fixed % settlement period(s)', v_fixed_count;
  RAISE NOTICE '';
  RAISE NOTICE '=== Verification Query ===';
  RAISE NOTICE 'Run this to verify all settlements:';
  RAISE NOTICE '';
  RAISE NOTICE 'SELECT ';
  RAISE NOTICE '  c.name,';
  RAISE NOTICE '  cap.period_number,';
  RAISE NOTICE '  cap.total_invoiced,';
  RAISE NOTICE '  cap.total_received,';
  RAISE NOTICE '  cap.total_pending,';
  RAISE NOTICE '  cap.waived_amount,';
  RAISE NOTICE '  cap.old_due_amount';
  RAISE NOTICE 'FROM customer_account_periods cap';
  RAISE NOTICE 'JOIN customers c ON c.id = cap.customer_id';
  RAISE NOTICE 'WHERE cap.is_active = false';
  RAISE NOTICE 'ORDER BY c.name, cap.period_number;';
  
END $$;
