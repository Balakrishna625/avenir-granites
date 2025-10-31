# Apply Consignment Deletion Fix

## Problem
When deleting consignments, you're getting this error:
```
Error: column 'total_elavance' can only be updated to DEFAULT
```

## Root Cause
The database trigger `update_consignment_totals()` tries to UPDATE the `total_elavance` column, which is defined as `GENERATED ALWAYS AS (total_gross_measurement - total_net_measurement) STORED`. PostgreSQL doesn't allow updating GENERATED columns.

## Solution
We've created a new trigger function that only updates the non-generated columns.

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration
1. Copy the ENTIRE contents of `migrations/FIX_consignment_delete_trigger.sql`
2. Paste it into the SQL Editor
3. Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Step 3: Verify
You should see output like:
```
Trigger Fix Applied!
Old triggers removed, new trigger created
Consignments can now be deleted without errors
```

And a table showing the new trigger: `trigger_update_consignment_totals_new`

## What the Fix Does
- ✅ Drops old problematic triggers
- ✅ Creates new trigger that ONLY updates: `total_blocks_count`, `total_net_measurement`, `total_gross_measurement`
- ✅ Leaves `total_elavance` alone (it's auto-calculated by PostgreSQL)
- ✅ Deletion now works correctly

## Test After Applying
1. Go to http://localhost:3000/consignments/details
2. Try deleting a test consignment
3. You should see a green success toast: "Consignment deleted successfully"
4. No more errors!
