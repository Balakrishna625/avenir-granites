# Grouped Entry System Implementation - Line Polish Reports

## Overview
Implemented a grouped entry system that allows multiple activity entries to share common shift details (date, shift, workers, hours, rate), matching the manual ledger format.

## Changes Made

### 1. Database Migration
**File**: `/migrations/add_entry_group_to_line_polish.sql`

Added:
- `entry_group_id` column (UUID) to group related entries
- Index for faster grouped queries
- All entries with the same `entry_group_id` represent work done in a single shift session

**To apply**: Run this migration in Supabase SQL Editor

### 2. Updated Data Structure

#### New Interfaces:
```typescript
interface ActivityRow {
  id: string; // Temporary ID for React keys
  activity: ActivityType;
  number_of_slabs: string;
  total_sqft: string;
}

interface FormData {
  date: string;
  shift: 'MORNING' | 'NIGHT';
  no_of_workers: string;
  no_of_hours: string;
  rate_per_hour: string;
  remarks: string;
  activityRows: ActivityRow[]; // NEW: Multiple activity rows
}
```

### 3. New UI Features

#### Form Layout:
```
┌─────────────────────────────────────────────────┐
│ Shift Details (Common for all activities)      │
│ - Date, Shift, Workers, Total Hours, Rate/Hr   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Activity Details                   [Add Activity]│
│ ┌───────────────────────────────────────────┐   │
│ │ Activity    │ Slabs │ SqFt │ Remove     │   │
│ ├───────────────────────────────────────────┤   │
│ │ S/G Polish  │  14   │ 1234 │   [×]      │   │
│ │ B/P Grinding│  23   │ 3456 │   [×]      │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Totals: 37 slabs | 4690 sqft | ₹36,250        │
└─────────────────────────────────────────────────┘
```

####Features:
- **Add Activity Button**: Adds new activity row
- **Remove Button**: Removes activity row (minimum 1 required)
- **Real-time Totals**: Shows aggregated slabs, sqft, and amount
- **Table Layout**: Clean, organized activity entry
- **Visual Sections**: Clearly separated common vs. variable fields

### 4. New Helper Functions

```typescript
// Add a new activity row
addActivityRow()

// Remove an activity row
removeActivityRow(rowId)

// Update a specific row field
handleActivityRowChange(rowId, field, value)

// Calculate totals
calculateTotals() // Returns { totalSlabs, totalSqft, totalAmount }
```

### 5. Submission Process

When submitting:
1. Generate unique `entry_group_id` for all entries
2. Create array of entries (one per activity row)
3. All entries share: date, shift, workers, hours, rate, amount, remarks, entry_group_id
4. Each entry has unique: activity, slabs, sqft
5. Submit all entries in bulk to `/api/line-polish-reports/bulk`

Example submission:
```javascript
{
  entries: [
    {
      date: '2025-10-17',
      shift: 'MORNING',
      activity: 'S/G Polishing',
      no_of_workers: 3,
      number_of_slabs: 14,
      total_sqft: 1234.50,
      no_of_hours: 145,
      rate_per_hour: 250,
      debit_amount: 36250,
      remarks: 'Regular shift',
      entry_group_id: 'abc-123-def-456'
    },
    {
      date: '2025-10-17',
      shift: 'MORNING',
      activity: 'B/P Grinding',
      no_of_workers: 3,
      number_of_slabs: 23,
      total_sqft: 3456.00,
      no_of_hours: 145,
      rate_per_hour: 250,
      debit_amount: 36250,
      remarks: 'Regular shift',
      entry_group_id: 'abc-123-def-456' // Same group ID
    }
  ]
}
```

### 6. Updated API

**File**: `/app/api/line-polish-reports/bulk/route.ts`

- Now supports `entry_group_id` field
- Validates all entries have required fields
- Inserts all entries in a single transaction
- Updates monthly balances for affected months

### 7. Key Design Decisions

1. **Payment Calculation**: 
   - ONE total amount for entire shift
   - Same hours × rate for all entries in group
   - Payment is NOT divided per activity

2. **Data Integrity**:
   - All grouped entries have identical: date, shift, workers, hours, rate, amount
   - Each entry has unique: activity, slabs, sqft
   - `entry_group_id` links them together

3. **Backward Compatibility**:
   - Old single entries have NULL entry_group_id
   - New grouped entries have non-NULL entry_group_id
   - Both types display correctly

4. **Editing**:
   - Currently simplified: editing loads single row
   - Future enhancement: support editing entire groups

## Usage Example

### Adding a Grouped Entry:

1. **Fill Common Fields**:
   - Date: 17/10/2025
   - Shift: A (Morning)
   - Workers: 3
   - Hours: 145
   - Rate: ₹250

2. **Add Activities**:
   - Click "Add Activity" to add rows
   - Row 1: S/G Polishing, 14 slabs, 1234.50 sqft
   - Row 2: B/P Grinding, 23 slabs, 3456.00 sqft
   - Row 3: S/G Laputra, 30 slabs, 2000.00 sqft

3. **Review Totals**:
   - Total Slabs: 67
   - Total Sq Ft: 6690.50
   - Total Amount: ₹36,250 (145 hrs × ₹250)

4. **Submit**: All 3 activities saved with same group ID

### Benefits:

✅ Matches manual ledger format exactly
✅ Single time entry for multiple activities
✅ Detailed activity tracking maintained
✅ Easy to analyze by granite type
✅ Payment calculation is clear and simple
✅ Reduces data entry errors

## Next Steps

1. **Run Database Migration**: Execute `add_entry_group_to_line_polish.sql`
2. **Run Activity Types Migration**: Execute `update_line_polish_activity_types.sql`
3. **Test the Form**: Add a grouped entry with multiple activities
4. **Verify Display**: Check that records display correctly in the table
5. **Future**: Enhance editing to support full group editing
