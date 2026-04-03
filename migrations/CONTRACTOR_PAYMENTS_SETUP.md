# Contractor Payments - Setup Guide

## Issues Found and Fixed

### 1. ✅ Key Mismatch Bug (FIXED)
**Problem**: The API returns `linePolish` but the page was trying to read `linepolish` (lowercase)
**Solution**: Fixed in `/app/contractors/page.tsx` line 86
- Before: `setLinePolishData(data.linepolish);`
- After: `setLinePolishData(data.linePolish);`

**Result**: Contractor LinePolish data will now display properly

### 2. ⚠️ Database Tables Missing (NEEDS ACTION)
**Problem**: The contractor payment tables don't exist in your database yet
**Solution**: Run the migration file

## How to Run the Migration

### Option 1: Via Supabase Dashboard (RECOMMENDED)

1. Open your browser and go to [supabase.com](https://supabase.com)
2. Sign in and select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button
5. Copy the entire contents of `/migrations/create_contractor_payments_system.sql`
6. Paste it into the SQL editor
7. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
8. You should see success messages in the Results panel

### Option 2: Via Command Line (Advanced)

If you have `psql` installed:

```bash
# Get your connection string from Supabase Dashboard > Settings > Database
# Then run:
psql "your-connection-string-here" -f migrations/create_contractor_payments_system.sql
```

## Verify Migration Success

After running the migration, run this query in SQL Editor to verify:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contractor_payments', 'contractor_payment_transactions');
```

You should see both tables listed:
- contractor_payments
- contractor_payment_transactions

## Test the Feature

1. Refresh your contractor payments page
2. Click **"Set Payable"** for Contractor Dinesh
3. Enter an amount (e.g., 100000)
4. Click Save
5. The amount should now persist and show correctly

6. Click **"Set Payable"** for Contractor LinePolish
7. Enter an amount (e.g., 50000)
8. Click Save
9. The amount should persist and show correctly

10. Try adding a payment using **"+ Add Payment"** button
11. The payment should be recorded and balance should update

## What the Migration Creates

### Tables:
1. **contractor_payments** - Monthly summary for each contractor
   - Tracks: payable amount, carry forward, balance
   - Unique constraint: (contractor_name, month)

2. **contractor_payment_transactions** - Individual payment records
   - Tracks: payment date, amount, mode, notes
   - Links to contractor_payments via foreign key

### Features:
- Automatic carry forward from previous months
- Auto-update of updated_at timestamp
- Proper indexes for fast queries
- Data validation (amount > 0, valid payment modes)

## Troubleshooting

### If "Set Payable" still doesn't work:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try setting a payable amount
4. Check for errors in the console
5. Look for network errors in the Network tab

### If you see "table does not exist" error:
- The migration hasn't been run yet
- Follow the steps in "How to Run the Migration" above

### If data disappears after refresh:
- This suggests the migration wasn't run successfully
- Verify tables exist using the verification query above
- Re-run the migration if tables are missing
