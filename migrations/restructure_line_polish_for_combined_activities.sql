-- Migration to restructure line_polish_reports for combined activity entries
-- This changes the structure to store ONE entry per shift with multiple activities in JSONB

-- Add new columns for storing multiple activities
ALTER TABLE line_polish_reports 
  ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::jsonb;

-- Add total columns that aggregate across all activities
ALTER TABLE line_polish_reports 
  ADD COLUMN IF NOT EXISTS total_slabs INTEGER DEFAULT 0;

ALTER TABLE line_polish_reports 
  ADD COLUMN IF NOT EXISTS total_sqft NUMERIC DEFAULT 0;

-- The existing columns will work as follows:
-- - activity: Will store a summary text like "S/G Polishing, B/P Grinding" (for display/search)
-- - number_of_slabs: Will be removed (using total_slabs instead)
-- - total_sqft: Already exists, will store total across all activities
-- - no_of_hours: Total hours for the entire shift (not per activity)
-- - rate_per_hour: Rate for the entire shift
-- - debit_amount: Total amount = no_of_hours × rate_per_hour (for all activities combined)

-- Drop the old activity CHECK constraint if it exists
ALTER TABLE line_polish_reports 
  DROP CONSTRAINT IF EXISTS line_polish_reports_activity_check;

-- Create index on activities JSONB for faster queries
CREATE INDEX IF NOT EXISTS line_polish_reports_activities_idx 
  ON line_polish_reports USING gin(activities);

-- Add comments
COMMENT ON COLUMN line_polish_reports.activities IS 
  'JSONB array of activity objects. Each object contains: {activity: string, slabs: number, sqft: number}. 
   Example: [{"activity":"S/G Polishing","slabs":14,"sqft":1234.5},{"activity":"B/P Grinding","slabs":23,"sqft":3456.0}]';

COMMENT ON COLUMN line_polish_reports.activity IS 
  'Summary text of all activities for easy display and search. Example: "S/G Polishing, B/P Grinding"';

COMMENT ON COLUMN line_polish_reports.total_slabs IS 
  'Total number of slabs across all activities in this shift';

COMMENT ON COLUMN line_polish_reports.no_of_hours IS 
  'Total hours worked in this shift (for ALL activities combined, not per activity)';

COMMENT ON COLUMN line_polish_reports.debit_amount IS 
  'Total amount for the entire shift = no_of_hours × rate_per_hour (not split per activity)';

-- Note: We're keeping number_of_slabs for backward compatibility with existing data
-- New entries will use total_slabs instead
