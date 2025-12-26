# Only Bill Feature Implementation

## Overview
Implemented "Only Bill" mode for sales that allows recording bills without actual sales details. This is used when material is purchased elsewhere but billed through your factory for mining audit compliance.

## What Changed

### 1. Database Schema
**File:** `/supabase/migrations/20250127_add_only_bill_column.sql`

Added:
- `only_bill` boolean column to sales table (default: false)
- Made `customer_id` nullable for bill-only transactions

**Action Required:** Run this migration in Supabase SQL Editor:
```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS only_bill BOOLEAN DEFAULT false;
ALTER TABLE sales ALTER COLUMN customer_id DROP NOT NULL;
```

### 2. Frontend Changes
**File:** `/app/sales/data-entry/page.tsx`

- Added `onlyBill` checkbox at the top of the form (amber styling)
- When checked:
  - Customer selection becomes optional (disabled with "N/A" text)
  - Sales items section becomes optional
  - Only requires official bill section to be filled
  - Shows helper text explaining the mode
- Tax amount auto-syncs to official bill tax when entered

### 3. API Changes

#### POST Handler - Create Sale
**File:** `/app/api/sales/route.ts`

- Added `onlyBill` parameter
- Different validation rules:
  - **Normal mode:** Requires customer_id, sale_date, items
  - **Only Bill mode:** Only requires sale_date and official_bill_items
- Skips items calculation when `onlyBill` is true
- Skips payment split validation when `onlyBill` is true
- Saves `customer_id` as null when `onlyBill` is true
- Stores `only_bill` flag in database
- Never creates consignments for bill-only transactions

#### PUT Handler - Update Sale
**File:** `/app/api/sales/[id]/route.ts`

- Same changes as POST handler
- Applies to updates/edits of existing sales

## Testing Checklist

### Before Testing
1. **Run the migration** in Supabase SQL Editor (see SQL above)
2. **Restart your dev server** if it's running

### Test Cases

#### ✅ Test 1: Normal Sale (Existing Functionality)
1. Go to Sales → Data Entry
2. Leave "Only Bill" unchecked
3. Fill customer, items, and optional official bill
4. Verify save works normally
5. Check that consignment is created (if checkbox enabled)

#### ✅ Test 2: Only Bill Mode - New Sale
1. Go to Sales → Data Entry
2. Check "Only Bill" checkbox
3. Verify:
   - Customer field shows "N/A (Only Bill Mode)" and is disabled
   - Helper text appears below checkbox
   - Items section is optional (can be left empty)
4. Fill only:
   - Date
   - Official bill items (at least one)
   - Official tax (should auto-sync if you enter tax amount first)
5. Save and verify:
   - Sale is created successfully
   - No error about missing customer or items
   - No consignment is created
   - Sale appears in table with no customer name

#### ✅ Test 3: Tax Amount Auto-Sync
1. Create new sale (either mode)
2. In main form, enter tax amount (e.g., 5000)
3. Verify official tax is automatically updated to same value
4. Edit official tax manually - should not affect main tax
5. Edit main tax again - should update official tax again

#### ✅ Test 4: Edit Only Bill Sale
1. Find a bill-only sale in the table
2. Click Edit
3. Verify:
   - "Only Bill" checkbox is checked
   - Customer field shows N/A
   - Only official bill items are shown
4. Modify official bill item
5. Save and verify update works

#### ✅ Test 5: Convert Normal Sale to Only Bill
1. Edit an existing normal sale
2. Check "Only Bill" checkbox
3. Verify customer field becomes disabled
4. Save and verify:
   - customer_id becomes null
   - sale_items are deleted
   - only official bill remains

#### ✅ Test 6: Validation
1. Try to create Only Bill sale without official bill items
2. Should show error: "Please add at least one official bill item"
3. Try normal sale without customer - should show validation error
4. Try normal sale without items - should show validation error

## Data Integrity Notes

✅ **No disruption to existing data:**
- Existing sales have `only_bill = false` by default
- Existing validation and logic unchanged for normal sales
- Consignment creation logic preserved for non-bill-only sales

✅ **Safe operations:**
- customer_id can be null now, but only for bill-only transactions
- sale_items can be empty for bill-only transactions
- All existing foreign key constraints remain intact

## Mining Audit Compliance

This feature allows you to:
1. Record official bills for materials purchased elsewhere
2. Maintain audit trail without creating false sales records
3. Keep bill-only transactions separate from actual sales
4. Generate proper documentation for mining department

## Troubleshooting

### Migration Error
If you get error about column already exists:
- Check if column exists: `SELECT only_bill FROM sales LIMIT 1;`
- If it exists, skip the ADD COLUMN step
- If it doesn't, ensure you're running in correct database

### Customer ID Error
If you get "customer_id cannot be null" error:
- Ensure you ran: `ALTER TABLE sales ALTER COLUMN customer_id DROP NOT NULL;`
- Check with: `SELECT is_nullable FROM information_schema.columns WHERE table_name='sales' AND column_name='customer_id';`
- Should return 'YES'

### Consignment Created for Only Bill
If consignment is created when it shouldn't:
- Check that `only_bill` is being sent to API
- Check API logs for the POST/PUT request body
- Verify condition: `if (!onlyBill && createConsignment)`

## Summary

The feature is complete and ready to test. It carefully separates bill-only transactions from actual sales while maintaining data integrity. The auto-sync of tax amounts makes data entry faster and reduces errors.

**Next Steps:**
1. Run the migration
2. Test all scenarios above
3. Use in production for mining audit bills
