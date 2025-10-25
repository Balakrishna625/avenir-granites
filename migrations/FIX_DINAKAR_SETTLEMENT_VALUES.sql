-- Fix Dinakar Garu's Settlement History - Correct Values
-- 
-- PROBLEM: Settlement history shows incorrect values after settlement
-- - Pending shows ₹1,78,459 (should be ₹0)
-- - Total Received not properly calculated
--
-- ANALYSIS:
-- Total Invoiced: ₹1,78,459
-- Transactions: ₹94,306 (RTGS) + ₹80,153 (CASH) = ₹1,74,459
-- Remaining: ₹1,78,459 - ₹1,74,459 = ₹4,000
-- Waived: ₹4,000
-- Settlement Payment: ₹4,000 (recorded separately during settlement)
--
-- CORRECT VALUES:
-- Total Invoiced: ₹1,78,459
-- Total Received: ₹1,74,459 (the transactions that were already there)
-- Pending: ₹0 (fully settled with ₹4,000 waiver)
-- Waived: ₹4,000
-- Settlement Amount: ₹4,000 (this was the final amount to close)

DO $$
DECLARE
  v_customer_id uuid;
  v_period_id uuid;
  v_customer_name text;
BEGIN
  -- Get Dinakar Garu's customer ID
  SELECT id, name INTO v_customer_id, v_customer_name
  FROM customers 
  WHERE name ILIKE '%Dinakar%Guntur%';
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found: Dinakar Garu (Guntur)';
  END IF;
  
  RAISE NOTICE '✅ Found customer: % (ID: %)', v_customer_name, v_customer_id;
  
  -- Get the settled period (Period #1)
  SELECT id INTO v_period_id
  FROM customer_account_periods
  WHERE customer_id = v_customer_id
    AND is_active = false
    AND settlement_date IS NOT NULL
  ORDER BY period_number DESC
  LIMIT 1;
  
  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'No settled period found for Dinakar Garu';
  END IF;
  
  RAISE NOTICE '✅ Found settled period: %', v_period_id;
  
  -- Show current values
  RAISE NOTICE '';
  RAISE NOTICE '=== BEFORE FIX ===';
  RAISE NOTICE 'Run this to see current values:';
  RAISE NOTICE 'SELECT total_invoiced, total_received, total_pending, waived_amount, settlement_amount FROM customer_account_periods WHERE id = ''%'';', v_period_id;
  
  -- Fix the settlement record with CORRECT values
  UPDATE customer_account_periods
  SET 
    total_invoiced = 178459,  -- ₹1,78,459 (from consignment)
    total_received = 174459,  -- ₹1,74,459 (RTGS ₹94,306 + CASH ₹80,153)
    total_pending = 0,        -- ₹0 (fully settled)
    old_due_amount = 0,       -- ₹0 (no previous dues)
    waived_amount = 4000,     -- ₹4,000 (commission to mediator)
    settlement_amount = 4000, -- ₹4,000 (final cash payment to close)
    settlement_mode = 'CASH',
    settlement_reference = 'Total Payment received',
    settlement_notes = '4000 given to mediator'
  WHERE id = v_period_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Updated settlement period with CORRECT values';
  RAISE NOTICE '';
  RAISE NOTICE '=== AFTER FIX ===';
  RAISE NOTICE 'Total Invoiced: ₹1,78,459';
  RAISE NOTICE 'Total Received: ₹1,74,459 (from transactions already recorded)';
  RAISE NOTICE 'Waived Amount: ₹4,000 (commission to mediator)';
  RAISE NOTICE 'Settlement Amount: ₹4,000 (final payment to close account)';
  RAISE NOTICE 'Total Pending: ₹0 (FULLY SETTLED)';
  RAISE NOTICE '';
  RAISE NOTICE '=== Math Check ===';
  RAISE NOTICE 'Total Invoiced: ₹1,78,459';
  RAISE NOTICE 'Already Received: ₹1,74,459';
  RAISE NOTICE 'Remaining: ₹4,000';
  RAISE NOTICE 'Waived: ₹4,000';
  RAISE NOTICE 'Result: ₹0 pending ✅';
  RAISE NOTICE '';
  RAISE NOTICE '=== Verification ===';
  RAISE NOTICE 'SELECT * FROM customer_account_periods WHERE id = ''%'';', v_period_id;
  
END $$;
