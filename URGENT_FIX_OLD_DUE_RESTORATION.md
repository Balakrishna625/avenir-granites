# 🚨 URGENT: Fix Applied - Restore Old Due Amounts

## What Went Wrong

The migration `fix_old_due_amount_calculation.sql` was **TOO AGGRESSIVE**. It updated **ALL customers** to match their active periods, which reset old due amounts to 0 for customers who shouldn't have been affected.

## The Problem

When you removed Mahalakshmi's previous due, the fix I provided:
- ❌ Updated **ALL customers** in the database
- ❌ Reset everyone's `old_due_amount` to match active periods (which is 0 for new periods)
- ❌ Lost the carried-forward old due amounts for other customers

## The Solution

I've created an **URGENT restoration migration**: `migrations/urgent_restore_old_due_amounts.sql`

### What It Does:

1. ✅ **Restores old due amounts** from settlement history for all affected customers
2. ✅ **Excludes Mahalakshmi** (keeps her at 0 since you wanted that)
3. ✅ **Removes the problematic trigger** that was causing global updates
4. ✅ **Shows before/after** diagnostics

## How to Apply the Fix

### Step 1: Run Restoration Migration

1. Open Supabase SQL Editor
2. Copy **ALL contents** from `migrations/urgent_restore_old_due_amounts.sql`
3. Paste and **Run**

You should see output like:
```
NOTICE: Number of customers affected: 4
[Shows list of customers to restore]
NOTICE: Customers restored: 4
NOTICE: New total old due amount: ₹XX,XX,XXX
```

### Step 2: Verify on Dashboard

1. Refresh your application
2. Select "All customers"
3. Check "Total Previous Dues" tile - should show the correct total again
4. Check individual customers - each should have their correct old due amount

## What Gets Restored

The migration restores `old_due_amount` by looking at each customer's **most recent settled period**:

```sql
Customer: ASHAPURA GRANITES
- Last settled period had old_due_amount: ₹5,00,000
- Current old_due_amount was reset to: ₹0
- Will be restored to: ₹5,00,000 ✅
```

## What About Mahalakshmi?

The restoration migration **excludes** customers named:
- "MahaLakshmi"
- "Mahalakshmi"

So if you wanted her old due reset to 0, she will stay at 0.

## Prevention

The restoration migration also:
1. **Removes the trigger** `trigger_sync_customer_old_due` that was causing global updates
2. **Removes the function** `sync_customer_old_due_amount()` 
3. **Adds a warning comment** on the customers table

## Going Forward

### ✅ DO:
- Update individual customer's old_due_amount through the UI
- Use settlement process which updates only that customer
- Edit settlement history for that specific customer

### ❌ DON'T:
- Run migrations that UPDATE all customers at once
- Use triggers that sync across all customers
- Apply global fixes for individual customer issues

## Verify the Fix

After running the restoration:

```sql
-- Check all customers' old due amounts
SELECT name, old_due_amount 
FROM customers 
ORDER BY old_due_amount DESC;
```

Expected results:
- ✅ Mahalakshmi: ₹0 (if that's what you wanted)
- ✅ Other customers: Their original old due amounts restored
- ✅ Total Previous Dues tile: Shows correct sum

## My Apologies

I made a critical error by creating a migration that updated all customers globally instead of just the one customer you were working with. The `fix_old_due_amount_calculation.sql` should never have been applied - it was designed to fix a systemic issue but ended up causing data loss for customers who were fine.

## Summary

**Problem**: All customers' old_due_amount was reset to 0
**Cause**: Global UPDATE statement in fix_old_due_amount_calculation.sql
**Solution**: Restore from settlement history for each customer
**Prevention**: Removed trigger, individual customer updates only

---

## Action Required

**RUN THIS NOW**: `migrations/urgent_restore_old_due_amounts.sql`

This will restore everyone's old due amounts except Mahalakshmi's.
