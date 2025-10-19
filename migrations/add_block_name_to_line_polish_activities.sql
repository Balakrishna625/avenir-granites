-- Migration to document block_name field in line_polish_reports activities JSONB
-- No schema change needed - JSONB is schema-less and can store any structure
-- This migration just updates the documentation/comments

-- Update the comment to document the new block_name field
COMMENT ON COLUMN line_polish_reports.activities IS 
  'JSONB array of activity objects. Each object contains: {block_name: string (optional), activity: string, slabs: number, sqft: number}. 
   Example: [{"block_name":"AVG-1A","activity":"S/G Polishing","slabs":14,"sqft":1234.5},{"block_name":"AVG-2B","activity":"B/P Grinding","slabs":23,"sqft":3456.0}]
   The block_name field is optional and can be used to track which granite block was processed.';

-- Note: Since activities is a JSONB column, it automatically supports the new block_name field
-- without requiring any ALTER TABLE statements. Existing records without block_name will continue to work.
