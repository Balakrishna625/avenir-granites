-- Migration to add entry grouping support for line polish reports
-- This allows multiple activity entries to share same date, shift, workers, hours, and rate

-- Add entry_group_id column to group related entries together
ALTER TABLE line_polish_reports 
  ADD COLUMN IF NOT EXISTS entry_group_id UUID;

-- Create index for faster grouped queries
CREATE INDEX IF NOT EXISTS line_polish_reports_entry_group_idx 
  ON line_polish_reports(entry_group_id);

-- Add comment explaining the grouping concept
COMMENT ON COLUMN line_polish_reports.entry_group_id IS 
  'Groups multiple activity entries that share the same date, shift, workers, hours, and rate. 
   All entries with the same entry_group_id represent work done in a single shift session.';

-- Note: Existing single entries will have NULL entry_group_id, which is fine
-- New grouped entries will all share the same UUID
