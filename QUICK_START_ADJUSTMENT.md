# Quick Start: Fix Prudhvi Account Balance

## Current Problem
- **System shows:** ₹-43,818 (too much debt)
- **Should show:** ₹-114 (actual debt)
- **Need to adjust:** -₹43,704

## Step-by-Step Fix

### Step 1: Run Database Migration
**Go to Supabase Dashboard → SQL Editor:**

1. Copy the SQL from: `supabase/migrations/20251024_add_bank_account_adjustments.sql`
2. Paste in SQL Editor
3. Click "Run"
4. Wait for success message

### Step 2: Use the Feature

1. **Open Expense Management page**
   - Navigate to your expense page in the app

2. **Find Prudhvi's tile**
   - Look at the "Bank Collections - Current Balance" section at the top
   - Find "PRUDVI A/C" tile

3. **Click Settings icon** ⚙️
   - Small gear icon in top-right corner of the tile

4. **Fill in the modal:**
   ```
   Adjustment Amount: -43,704
   Notes: Previous settlements before Oct 2025
   ```

5. **Click "Save Adjustment"**

6. **See the magic! ✨**
   - Current Balance immediately updates to ₹-114
   - Opening balance now includes the adjustment
   - Future calculations automatically include this

### Step 3: Repeat for Other Accounts (if needed)

For each account with pre-tracking settlements:
1. Click ⚙️ on that account's tile
2. Calculate: `Actual Balance - Shown Balance = Adjustment`
3. Enter the adjustment amount
4. Add explanatory notes
5. Save

## Formula for Calculating Adjustment

```
Adjustment = Actual Balance - Shown Balance

Example (Prudhvi):
Adjustment = (-114) - (-43,818)
Adjustment = -114 + 43,818
Adjustment = 43,704

Since we want to REDUCE the debt shown, we enter: -43,704
```

## What Happens Behind the Scenes

**Before Adjustment:**
```
Opening Balance = 0 (no data before Oct)
Current Balance = 0 + Received - Expenses = -43,818
```

**After Adjustment:**
```
Opening Balance = 0 + Adjustment(-43,704) = -43,704
Current Balance = -43,704 + Received - Expenses = -114 ✅
```

## Important Notes

✅ **One adjustment per account** - Previous adjustment is replaced if you update
✅ **Persists across months** - Adjustment carries forward automatically
✅ **Visible in exports** - Excel files show correct adjusted balances
✅ **Editable anytime** - Click ⚙️ again to modify or remove adjustment
✅ **Notes are important** - Help new users understand why balance looks different

## Verification

After setting adjustment:
- [ ] Tile shows correct current balance
- [ ] Opening balance includes adjustment
- [ ] Refresh page - balance still correct
- [ ] Filter by account and export to Excel - numbers match
- [ ] Next month - adjustment still applies correctly

## Need Help?

See full documentation: `OPENING_BALANCE_ADJUSTMENT_GUIDE.md`
