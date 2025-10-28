-- ============================================================================
-- PREREQUISITE MIGRATION: Add activities column to line_polish_reports
-- ============================================================================
-- RUN THIS FIRST before create_consignment_production_summary_view.sql
-- This ensures the activities column exists as JSONB type
-- ============================================================================

-- Add activities column if it doesn't exist
ALTER TABLE line_polish_reports 
  ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::jsonb;

-- Add GIN index for JSONB queries (performance optimization)
CREATE INDEX IF NOT EXISTS line_polish_reports_activities_idx 
  ON line_polish_reports USING gin(activities);

-- Add total_slabs column if it doesn't exist (for aggregation)
ALTER TABLE line_polish_reports 
  ADD COLUMN IF NOT EXISTS total_slabs INTEGER DEFAULT 0;

-- Add documentation
COMMENT ON COLUMN line_polish_reports.activities IS 
  'JSONB array of activity objects. Each object contains: {block_name: string, activity: string, slabs: number, sqft: number}. 
   Example: [{"block_name":"AVG-1A","activity":"Polishing","slabs":14,"sqft":1234.5}]';

COMMENT ON COLUMN line_polish_reports.total_slabs IS 
  'Total number of slabs across all activities in this shift (aggregated)';

-- Verify the column was created correctly
DO $$ 
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns 
  WHERE table_name = 'line_polish_reports' 
    AND column_name = 'activities';
  
  IF col_type IS NULL THEN
    RAISE EXCEPTION 'activities column was not created!';
  ELSIF col_type != 'jsonb' THEN
    RAISE EXCEPTION 'activities column exists but is type % instead of jsonb', col_type;
  ELSE
    RAISE NOTICE 'SUCCESS: activities column exists as JSONB type';
  END IF;
END $$;
