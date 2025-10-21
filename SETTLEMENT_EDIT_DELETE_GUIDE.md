# Settlement History Edit & Delete Feature

## Overview

You can now **edit** or **delete** settlement history records to correct mistakes or remove incorrect data. This is different from "reversing" a settlement - you're simply fixing historical records.

## Step 1: Run the Database Migration

### In Supabase SQL Editor:

1. Go to your Supabase project
2. Open **SQL Editor**
3. Create a **New Query**
4. Copy the contents of `migrations/add_settlement_history_edit_delete.sql`
5. Paste and **Run**

This will create two new database functions:
- `edit_settlement_history()` - Update settlement values
- `delete_settlement_history()` - Delete settlement records

## Step 2: How to Use

### Edit Settlement History

1. Go to **Settlement History** page (from sidebar or customer dashboard)
2. Find the settlement record you want to edit
3. Click the **Edit** button
4. An inline edit form will appear with all editable fields:
   - Total Invoiced
   - Total Received
   - Total Pending
   - Waived Amount
   - Settlement Amount
   - Payment Mode
   - Reference
   - Notes

5. Update the values as needed
6. Click **Save Changes**
7. Confirm the update

### Delete Settlement History

1. Go to **Settlement History** page
2. Find the settlement record you want to delete
3. Click the **Delete** button (red)
4. Confirm deletion (⚠️ **This cannot be undone!**)

## Important Rules

### Edit Restrictions
- ✅ Can edit: **Inactive/historical** periods only
- ❌ Cannot edit: **Active** (current) periods
- ✅ Can update: All financial values and settlement details
- ⏱️ Changes: Take effect immediately

### Delete Restrictions
- ✅ Can delete: **Historical** periods only
- ❌ Cannot delete: **Active** periods
- ❌ Cannot delete: Periods with later settlements after them (must delete most recent first)
- ⚠️ **Permanent**: Cannot be undone

## Your Use Case

Based on your description:
> "Total pending is showing but they paid everything, only is pending and we waived that"

### Steps to Fix:

1. Click **Edit** on the incorrect settlement record
2. Update these fields:
   - **Total Pending**: Set to the actual pending amount (e.g., 5000)
   - **Waived Amount**: Set to the waived amount (e.g., 5000)
   - **Total Received**: Adjust if they paid everything
3. Click **Save Changes**

The corrected values will now show in:
- ✅ Settlement History page
- ✅ Customer Analytics
- ✅ Total Previous Dues tile
- ✅ Excel exports

## Example Scenario

### Before (Incorrect):
```
Total Invoiced: ₹1,00,000
Total Received: ₹80,000
Total Pending: ₹20,000  ❌ Wrong!
Waived: ₹0  ❌ Wrong!
```

### After Edit (Correct):
```
Total Invoiced: ₹1,00,000
Total Received: ₹95,000  ✅ Updated (they paid everything except waived)
Total Pending: ₹5,000    ✅ Correct (only this was pending)
Waived: ₹5,000           ✅ Correct (this was waived)
```

## Safety Features

1. **Confirmation Required**: Both edit and delete require confirmation
2. **Historical Only**: Cannot modify active periods
3. **Sequential Delete**: Must delete newest settlements first
4. **Immediate Refresh**: Page reloads to show updated data
5. **Error Messages**: Clear feedback if something goes wrong

## Database Functions

### edit_settlement_history()
```sql
SELECT edit_settlement_history(
  p_period_id := 'settlement-uuid-here',
  p_total_pending := 5000,
  p_waived_amount := 5000
);
```

### delete_settlement_history()
```sql
SELECT delete_settlement_history('settlement-uuid-here');
```

## What Gets Updated

When you edit a settlement history record:
- ✅ Financial totals (invoiced, received, pending)
- ✅ Waived amount
- ✅ Settlement details (amount, mode, reference, notes)
- ✅ Values shown in Settlement History page
- ✅ Customer summary calculations
- ❌ Does NOT affect: Active period or current transactions

## Verification

After editing/deleting:
1. Check Settlement History page - values should be updated
2. Check "Total Previous Dues" tile - should reflect changes
3. Check Customer Analytics - summaries should be correct
4. Export to Excel - verify correct values

## Troubleshooting

### "Cannot edit active period"
- **Issue**: Trying to edit the current active period
- **Solution**: Only historical settlements can be edited

### "Cannot delete this settlement because there are later settlements"
- **Issue**: Trying to delete an old settlement when newer ones exist
- **Solution**: Delete the most recent settlements first, then work backwards

### "Settlement period not found"
- **Issue**: Invalid period ID
- **Solution**: Refresh the page and try again

## Important Notes

1. **This is for corrections only**: Use this to fix data entry mistakes or incorrect values
2. **Not a reversal**: This doesn't "undo" a settlement or restore old periods
3. **Historical records**: Only affects settlement history, not active periods
4. **Permanent deletion**: Deleted records cannot be recovered
5. **Financial accuracy**: Always verify totals add up correctly after editing

## Best Practices

1. ✅ **Double-check** values before saving
2. ✅ **Add notes** explaining why you edited (use settlement_notes field)
3. ✅ **Verify** calculations after editing (pending = invoiced - received - waived)
4. ✅ **Test** on one record first before bulk editing
5. ✅ **Export** data before making major changes

---

## Summary

**Before**: Settlement history was read-only, incorrect values couldn't be fixed

**Now**: You can edit any field or delete entire records to correct mistakes

**Use when**: Data entry errors, wrong amounts, incorrect waived amounts, or need to clean up test data

**Safety**: Only historical records, requires confirmation, clear error messages
