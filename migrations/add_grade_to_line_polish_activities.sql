-- Migration to add optional 'grade' field to line_polish_reports activities JSONB
-- This tracks the quality grade of the processed slabs

-- No schema change needed - JSONB is schema-less and can store any structure
-- This migration just updates the documentation/comments

-- Update the comment to document the new grade field
COMMENT ON COLUMN line_polish_reports.activities IS 
  'JSONB array of activity objects. Each object contains: {block_name: string (optional), activity: string, slabs: number, sqft: number, grade: string (optional)}. 
   Example: [{"block_name":"AVG-1A","activity":"S/G Polishing","slabs":14,"sqft":1,234.5,"grade":"Fresh"},{"block_name":"AVG-2B","activity":"B/P Grinding","slabs":23,"sqft":3,456.0,"grade":"Blackline"}]
   
   Fields:
   - block_name: The granite block identifier (optional)
   - activity: Type of polish activity (required)
   - slabs: Number of slabs processed (required)
   - sqft: Square feet processed (required)
   - grade: Quality grade - one of: Blackline, White line, Fresh, Patch, Variation (optional)
   
   The grade field is completely optional and existing records without it will continue to work.';

-- Note: Since activities is a JSONB column, it automatically supports the new grade field
-- without requiring any ALTER TABLE statements. This is a backward-compatible change.
-- Existing data: ✓ Will work (grade field not required)
-- New data with grade: ✓ Will store the grade
-- New data without grade: ✓ Will work (grade field optional)
