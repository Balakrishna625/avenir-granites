# Line Polish Activity Types Update

## Overview
Updated the Line Polish Reports system to support detailed activity tracking by granite type and process.

## Changes Made

### 1. Database Migration (`/migrations/update_line_polish_activity_types.sql`)
Created a migration script to update the database schema:
- Removes old CHECK constraint on `activity` column
- Adds new CHECK constraint with all new activity types
- Maintains backward compatibility with old values (GRINDING, POLISHING)

**To apply this migration:**
1. Open your Supabase SQL Editor
2. Copy and paste the contents of `migrations/update_line_polish_activity_types.sql`
3. Run the migration

### 2. New Activity Types
The system now supports 13 specific activity types organized by granite type:

#### S/G (Steel Grey) - 5 activities
- S/G Polishing
- S/G Laputra
- S/G Grinding
- S/G Polish Grinding
- S/G Laputra Grinding

#### B/P (Black Pearl) - 5 activities
- B/P Polishing
- B/P Laputra
- B/P Grinding
- B/P Polish Grinding
- B/P Laputra Grinding

#### Burgandy - 3 activities
- Burgandy Polishing
- Burgandy Grinding
- Burgandy Polish Grinding

#### Legacy (Backward Compatibility)
- GRINDING (old data)
- POLISHING (old data)

### 3. Frontend Updates (`/app/production/line-polish/page.tsx`)

#### TypeScript Interface
- Created `ActivityType` union type with all activity options
- Updated `LinePolishReport` interface to use new type
- Updated `FormData` interface to use new type

#### Activity Dropdown (Form)
- Replaced simple dropdown with organized optgroups
- Groups activities by granite type (S/G, B/P, Burgandy)
- Default value changed to "S/G Polishing"

#### Activity Filter
- Replaced button group with dropdown for better scalability
- Organized filter options by granite type
- Includes "All Activities" option
- Legacy values labeled as "(Old)" for clarity

### 4. Benefits
- **Better Data Segregation**: Easy to split reports by granite type in the future
- **Detailed Tracking**: Track specific processes (Polishing, Laputra, Grinding combinations)
- **Scalability**: Easy to add more granite types or processes
- **Backward Compatible**: Old records with GRINDING/POLISHING still work

## Next Steps
1. **Run the database migration** in Supabase
2. **Test the form** by adding new line polish reports
3. **Verify filters** work correctly with the new activity types
4. Future: Consider adding analytics/reports grouped by granite type (S/G, B/P, Burgandy)

## Usage Example
When adding a new report:
1. Select date and shift
2. Choose activity from dropdown (e.g., "S/G Polishing" or "B/P Laputra Grinding")
3. Fill in other details (workers, slabs, sqft, hours, rate)
4. Submit

The activity value will be stored exactly as shown (e.g., "S/G Polishing"), making it easy to filter and analyze data by:
- Granite type (all S/G activities, all B/P activities, etc.)
- Process type (all Polishing, all Grinding, all Laputra, etc.)
- Specific combinations (e.g., only "S/G Polish Grinding")
