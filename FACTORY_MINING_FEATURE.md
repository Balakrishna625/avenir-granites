# Factory Mining Amount Feature - Implementation Summary

## Overview
Added factory mining amount tracking for "Only Bill" transactions where material is bought from another factory but billed from your factory for audit purposes.

## What Was Implemented

### 1. Database Migration
**File**: `migrations/add_factory_mining_columns.sql`

Adds two new columns to the `sales` table:
- `factory_mining_rate` (NUMERIC, default: 7) - Rate per sqft charged to factory account
- `factory_mining_amount` (NUMERIC, default: 0) - Total amount (rate × total sqft)

**Action Required**: Run this migration in your Supabase SQL editor before using the feature.

### 2. UI Changes (Sales Data Entry Page)

#### New Form Fields (Only visible in "Only Bill" mode):
- **Total Sq.Ft**: Auto-calculated from official bill items (read-only)
- **Rate per Sq.Ft**: Editable field (default: 7 rupees)
- **Factory Mining Amount**: Auto-calculated display (rate × total sqft)

#### Display Location:
- Appears after Official Bill section
- Shows in amber-colored box to distinguish from other charges
- Clear label: "Factory Mining Charges (Our Factory Account)"

### 3. Calculation Logic

**Auto-calculation happens when**:
- Official bill items square feet changes
- Factory mining rate is modified
- Formula: `Total Official Sqft × Factory Mining Rate = Factory Mining Amount`

**Example**:
- Official Bill Item 1: 100 sqft
- Official Bill Item 2: 50 sqft
- Total: 150 sqft
- Rate: 7 rupees/sqft
- Factory Mining Amount: 150 × 7 = ₹1,050.00

### 4. Data Isolation

**Does NOT affect**:
- Sales statistics or averages
- Customer calculations
- Actual sales totals
- Analytics or reports

**Only tracked for**:
- Factory account reconciliation
- Audit purposes
- Internal charge tracking

### 5. API Updates

**POST /api/sales**:
- Accepts `factory_mining_rate` and `factory_mining_amount`
- Only saves when `onlyBill: true`
- Otherwise saves as `null`

**PUT /api/sales/[id]**:
- Same behavior as POST
- Updates existing records safely

**GET /api/sales**:
- Returns factory mining fields if present
- Backward compatible with old records

## Usage Instructions

### Creating a New "Only Bill" Transaction:

1. Select **"Only Bill (Mining Audit)"** from Entry Type dropdown
2. Add official bill items with square feet
3. The "Factory Mining Charges" section appears automatically
4. Total sqft is calculated automatically
5. Default rate is 7 rupees (editable)
6. Factory mining amount is calculated automatically
7. Submit the form

### Editing Existing Transactions:

1. Click edit on any "Only Bill" transaction
2. Factory mining fields populate if they exist
3. Modify rate if needed
4. Amount recalculates automatically
5. Save changes

### Changing the Default Rate:

The default rate is 7 rupees but you can:
1. Change it for individual transactions in the form
2. Modify the default in code: `factory_mining_rate: '7'` in initialFormData (line ~156)

## Technical Details

### TypeScript Interfaces Updated:
- `Sale` interface: Added optional `factory_mining_rate` and `factory_mining_amount`
- `FormData` interface: Added required string fields for form handling

### State Management:
- Auto-recalculates on official bill item changes
- Syncs rate changes with amount calculations
- Resets to defaults when switching entry types

### Database Schema:
```sql
factory_mining_rate NUMERIC DEFAULT 7
factory_mining_amount NUMERIC DEFAULT 0
```

## Testing Checklist

- [ ] Run database migration
- [ ] Create new "Only Bill" transaction
- [ ] Verify factory mining amount calculates correctly
- [ ] Edit existing "Only Bill" transaction
- [ ] Change factory mining rate and verify recalculation
- [ ] Verify old transactions still work
- [ ] Confirm factory mining doesn't affect sales statistics
- [ ] Test with multiple official bill items

## Files Modified

1. `migrations/add_factory_mining_columns.sql` - NEW
2. `app/sales/data-entry/page.tsx` - Updated
3. `app/api/sales/route.ts` - Updated
4. `app/api/sales/[id]/route.ts` - Updated

## Database Migration Command

```sql
-- Copy and run in Supabase SQL Editor
-- Location: migrations/add_factory_mining_columns.sql
```

## Safety Features

✅ Uses `IF NOT EXISTS` in migration (safe to re-run)
✅ Nullable columns (backward compatible)
✅ Only shows for "Only Bill" mode
✅ Isolated from sales calculations
✅ No data corruption risk
✅ Old transactions unaffected

## Support

If you encounter any issues:
1. Check that migration was run successfully
2. Verify "Only Bill" mode is selected
3. Ensure official bill items have square feet entered
4. Check browser console for errors
