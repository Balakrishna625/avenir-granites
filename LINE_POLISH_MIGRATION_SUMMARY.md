# Line Polish Reports - Combined Activities Migration

## Overview
Migrated from storing separate database rows for each activity to storing ONE row per shift with multiple activities stored in a JSONB array.

## Key Change
**Before:** Multiple database rows per shift (one row per activity), each with same hours/amount
```
Row 1: S/G Polishing | 12 hrs | ₹3000
Row 2: B/P Grinding  | 12 hrs | ₹3000
Row 3: S/G Laputra   | 12 hrs | ₹3000
```

**After:** Single database row per shift with JSONB activities array
```
ONE Row: {
  activity: "S/G Polishing, B/P Grinding, S/G Laputra",
  activities: [
    { activity: "S/G Polishing", slabs: 14, sqft: 1234.5 },
    { activity: "B/P Grinding", slabs: 23, sqft: 3456.0 },
    { activity: "S/G Laputra", slabs: 10, sqft: 890.0 }
  ],
  no_of_hours: 12,      // TOTAL for all activities
  debit_amount: 3000    // TOTAL for all activities (12 × 250)
}
```

## Data Model

### Database Schema Changes
```sql
-- Added columns
ALTER TABLE line_polish_reports ADD COLUMN activities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE line_polish_reports ADD COLUMN total_slabs INTEGER DEFAULT 0;
CREATE INDEX idx_line_polish_activities ON line_polish_reports USING GIN (activities);

-- Modified columns
-- activity: Now stores summary text like "S/G Polishing, B/P Grinding"
-- total_sqft: Now stores sum of all activities' sqft
```

### JSONB Structure
```json
{
  "date": "2025-01-17",
  "shift": "MORNING",
  "activity": "S/G Polishing, B/P Grinding",
  "activities": [
    {
      "activity": "S/G Polishing",
      "slabs": 14,
      "sqft": 1234.5
    },
    {
      "activity": "B/P Grinding", 
      "slabs": 23,
      "sqft": 3456.0
    }
  ],
  "no_of_workers": 3,
  "total_slabs": 37,
  "total_sqft": 4690.5,
  "no_of_hours": 145,
  "rate_per_hour": 250,
  "debit_amount": 36250
}
```

## Activity Types (13 Total)
Organized by granite type:

**S/G (Sadarahalli Granite):**
- S/G Polishing
- S/G Laputra
- S/G Grinding
- S/G Polish Grinding
- S/G Laputra Grinding

**B/P (Black Pearl):**
- B/P Polishing
- B/P Laputra
- B/P Grinding
- B/P Polish Grinding
- B/P Laputra Grinding

**Burgandy:**
- Burgandy Polishing
- Burgandy Grinding
- Burgandy Polish Grinding

## Migration Steps

### 1. Run Database Migrations
Execute these SQL files in Supabase SQL Editor:

```bash
# First migration: Update activity types
migrations/update_line_polish_activity_types.sql

# Second migration: Restructure table for combined activities
migrations/restructure_line_polish_for_combined_activities.sql
```

### 2. Code Changes Made

**Frontend (`app/production/line-polish/page.tsx`):**
- Updated `LinePolishReport` interface to include `activities` JSONB array
- Modified `handleSubmit` to create ONE entry with activities array
- Kept dynamic activity table UI (add/remove rows)
- Real-time totals calculation for slabs and sqft

**API (`app/api/line-polish-reports/route.ts`):**
- Updated POST endpoint to accept `activities` array
- Validates activities array is present and non-empty
- Stores activities as JSONB in database
- Stores aggregated totals (total_slabs, total_sqft)

### 3. Data Flow

**User Input:**
1. Enters common fields: date, shift, workers, hours, rate
2. Adds multiple activity rows: activity type, slabs, sqft
3. Clicks "Add Line Polish Report"

**Processing:**
1. Calculate totals:
   - total_slabs = sum of all activity rows' slabs
   - total_sqft = sum of all activity rows' sqft
   - debit_amount = no_of_hours × rate_per_hour (ONE calculation)
2. Create activity summary: "S/G Polishing, B/P Grinding"
3. Build activities array: `[{ activity, slabs, sqft }, ...]`
4. Submit ONE entry to API

**Storage:**
1. Single INSERT into line_polish_reports
2. activities stored as JSONB
3. Totals stored in dedicated columns for fast querying

## Important Notes

### Payment Calculation
**CRITICAL:** The hours and amount are for the ENTIRE shift, NOT per activity.

✅ **Correct:**
- 3 activities, 12 total hours, rate ₹250/hr
- Total amount = 12 × 250 = ₹3000 (for all activities combined)

❌ **Wrong:**
- 3 activities × (12 hours × ₹250) = ₹9000
- This would triple-pay the workers!

### Backwards Compatibility
- Kept `entry_group_id` column for historical data (marked deprecated)
- Old entries with separate rows won't break the system
- New entries use JSONB approach

### Display Logic
When showing reports:
- Parse `activities` JSONB to show breakdown
- Use `activity` text column for quick summary
- Show total_slabs and total_sqft from dedicated columns

## Testing Checklist

- [ ] Run both migrations in Supabase
- [ ] Test adding entry with single activity
- [ ] Test adding entry with multiple activities (3+)
- [ ] Verify totals calculate correctly
- [ ] Verify amount = hours × rate (not multiplied per activity)
- [ ] Check that activities JSONB stores correctly
- [ ] Verify GIN index created on activities column
- [ ] Test filtering/searching by activity text
- [ ] Check metrics calculations work with new structure
- [ ] Verify no duplicate rows created per activity

## Files Modified

1. `/migrations/restructure_line_polish_for_combined_activities.sql` - NEW
2. `/migrations/update_line_polish_activity_types.sql` - CREATED EARLIER
3. `/app/production/line-polish/page.tsx` - UPDATED
4. `/app/api/line-polish-reports/route.ts` - UPDATED

## Obsolete Files
- `/migrations/add_entry_group_to_line_polish.sql` - Created during initial misunderstanding
- `/app/api/line-polish-reports/bulk/route.ts` - May still be used elsewhere, keep for now
