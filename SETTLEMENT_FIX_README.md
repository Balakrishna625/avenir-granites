# Settlement Bug Fix: Waived Amount Not Reset

## Problem Description

When settling a customer account, the `customers.waived_amount` field was **NOT being reset to 0**, causing the UI to show waived amounts even after settlement. This created a confusing state where:

- The account appeared to be settled
- But waived amounts were still shown in the customer summary
- Total pending calculations were incorrect
- The settlement history didn't properly reflect all waivers

### Specific Case: Dinakar Garu (Guntur)

User added a ₹4,000 waiver with note "Commission to Mediator", then clicked "Settle Payment". Expected behavior was to clear all balances and start fresh, but instead:

**Expected State After Settlement:**
- All balances → 0
- Everything moved to settlement history
- Fresh start for new period

**Actual State (Buggy):**
- Received RTGS: ₹4,000
- Total Pending: ₹1,70,459
- Previous Due: ₹1,78,459
- Total Amount Waived: ₹4,000 (still showing)
- Confusing partial state

## Root Cause

The `settle_customer_account()` database function was:

1. ✅ Recording settlement in period history
2. ✅ Creating new active period
3. ✅ Preserving waived_transactions records
4. ❌ **NOT resetting `customers.waived_amount` to 0**

This caused the waived amount to "carry over" to the new period instead of being recorded in history and cleared.

## Solution

### 1. Fix the Database Function

**File:** `migrations/fix_settlement_reset_customer_waived_amount.sql`

**Changes Made:**
- Added logic to read `customers.waived_amount` before settlement
- Included customer-level waivers in period's total waived amount
- **Added critical fix: Reset `customers.waived_amount = 0` after settlement**
- Ensured new period starts with `waived_amount = 0`

**Key Code Addition:**
```sql
-- Get customer's current waived amount
SELECT coalesce(waived_amount, 0)
INTO v_customer_waived
FROM customers
WHERE id = p_customer_id;

-- Total waived is period waived + customer waived
v_waived := v_waived + v_customer_waived;

-- ... settlement logic ...

-- *** FIX: Reset customer's waived_amount to 0 (fresh start) ***
UPDATE customers
SET 
  old_due_amount = v_carried_forward,
  waived_amount = 0 -- RESET to 0 for new period
WHERE id = p_customer_id;
```

### 2. Fix Dinakar Garu's Account

**File:** `migrations/fix_dinakar_garu_account.sql`

This script provides **three approaches**:

#### Option 1: Simple Field Fix (RECOMMENDED - SAFEST)
- Finds Dinakar Garu's customer record
- Moves `customers.waived_amount` to most recent settlement period
- Resets `customers.waived_amount` to 0
- **No data loss, surgical fix**

#### Option 2: Complete Re-settlement
- Reverses the incorrect settlement
- Merges periods back together
- Allows re-running settlement with fixed function
- **More complex, use if Option 1 doesn't work**

#### Option 3: Manual Value Update
- Directly sets specific values
- Requires examining data first
- **Most control, but requires understanding current state**

## How to Apply the Fix

### Step 1: Apply the Function Fix

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/fix_settlement_reset_customer_waived_amount.sql
```

This updates the `settle_customer_account()` function to properly reset waived amounts.

### Step 2: Fix Dinakar Garu's Account

**Option A - Safest (Recommended):**

```sql
-- Run the SAFEST APPROACH section from:
-- migrations/fix_dinakar_garu_account.sql

DO $$
DECLARE
  v_customer_id uuid;
  v_customer_name text;
  v_current_waived numeric;
  v_settled_period_id uuid;
BEGIN
  -- Get customer details
  SELECT id, name, waived_amount 
  INTO v_customer_id, v_customer_name, v_current_waived
  FROM customers 
  WHERE name ILIKE '%Dinakar%Guntur%';
  
  -- ... rest of the script
END $$;
```

**Option B - If you want to re-settle:**

1. First run the "ALTERNATIVE" section to reverse settlement
2. Then use the UI's "Settle Payment" button again (now with fixed function)

### Step 3: Verify the Fix

Run these queries to confirm:

```sql
-- 1. Check customer's current state
SELECT id, name, waived_amount, old_due_amount 
FROM customers 
WHERE name ILIKE '%Dinakar%Guntur%';
-- Expected: waived_amount = 0, old_due_amount = 0 (or carried forward balance)

-- 2. Check settlement history
SELECT 
  period_number, 
  waived_amount, 
  settlement_amount,
  settlement_date,
  settlement_notes
FROM customer_account_periods 
WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%Dinakar%Guntur%')
ORDER BY period_number DESC
LIMIT 2;
-- Expected: Most recent settled period shows waived_amount = 4000

-- 3. Verify waived transactions preserved
SELECT * FROM waived_transactions 
WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%Dinakar%Guntur%')
ORDER BY created_at DESC;
-- Expected: ₹4,000 entry with "Commission to Mediator" note still exists
```

## Impact Assessment

### What This Fix Changes:

✅ **Fixed:**
- Settlement now properly resets `customers.waived_amount` to 0
- All waivers recorded in settlement history (`customer_account_periods.waived_amount`)
- New periods start with clean slate (waived_amount = 0)
- UI correctly shows 0 waivers for new period
- Total pending calculations correct

✅ **Preserved:**
- All `waived_transactions` records (history preserved)
- All settlement history records
- All consignment and transaction data
- No data loss

### Affected Customers:

**ONLY Dinakar Garu (Guntur)** needs manual fix because:
- Settlement was performed with buggy function
- Account is in partial state
- All other customers unaffected

**Future settlements** will work correctly once function is updated.

## Testing Checklist

After applying both migrations:

- [ ] Run Step 1: Apply function fix
- [ ] Run Step 2: Fix Dinakar Garu's account
- [ ] Run Step 3: Verification queries
- [ ] Check Dinakar Garu in UI:
  - [ ] Waived amount shows 0
  - [ ] Settlement history shows ₹4,000 waiver
  - [ ] Total pending is correct
  - [ ] No confusing balances
- [ ] Test new settlement with different customer:
  - [ ] Add waiver amount
  - [ ] Settle account
  - [ ] Verify waived_amount resets to 0
  - [ ] Check settlement history includes waiver
  - [ ] Confirm new period starts clean

## Files Created

1. **migrations/fix_settlement_reset_customer_waived_amount.sql**
   - Updates `settle_customer_account()` function
   - Critical fix for all future settlements

2. **migrations/fix_dinakar_garu_account.sql**
   - Manual correction for Dinakar Garu's account
   - Three approaches (simple fix recommended)

3. **SETTLEMENT_FIX_README.md** (this file)
   - Complete documentation
   - Step-by-step instructions
   - Verification procedures

## Questions?

If you have any questions or issues:

1. **Before applying:** Check current state with verification queries
2. **After applying:** Run verification queries to confirm
3. **If issues:** The safest option always preserves data - you can re-run

## Timeline

- **Bug Discovered:** Session 15, after settling Dinakar Garu (Guntur)
- **Root Cause:** `customers.waived_amount` not reset in settlement function
- **Fix Created:** Session 15
- **Status:** ⚠️ Awaiting application in Supabase

## Summary for User

**What to do:**
1. Open Supabase SQL Editor
2. Copy and run: `migrations/fix_settlement_reset_customer_waived_amount.sql`
3. Copy and run: The "SAFEST APPROACH" section from `migrations/fix_dinakar_garu_account.sql`
4. Verify with the queries in Step 3
5. Check Dinakar Garu's account in the UI - should show clean state

**Result:**
- Dinakar Garu's account will be corrected (waived amount → 0, in history)
- All future settlements will work correctly
- No other customer data affected
- All historical data preserved
