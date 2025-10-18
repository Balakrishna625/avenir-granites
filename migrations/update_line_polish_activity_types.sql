-- Migration to update activity types in line_polish_reports table
-- Adding new activity types for different granite types and processes

-- Drop the old CHECK constraint on activity column
ALTER TABLE line_polish_reports 
  DROP CONSTRAINT IF EXISTS line_polish_reports_activity_check;

-- Add new CHECK constraint with all activity types
ALTER TABLE line_polish_reports 
  ADD CONSTRAINT line_polish_reports_activity_check 
  CHECK (activity IN (
    'S/G Polishing',
    'S/G Laputra',
    'S/G Grinding',
    'S/G Polish Grinding',
    'S/G Laputra Grinding',
    'B/P Polishing',
    'B/P Laputra',
    'B/P Grinding',
    'B/P Polish Grinding',
    'B/P Laputra Grinding',
    'Burgandy Polishing',
    'Burgandy Grinding',
    'Burgandy Polish Grinding',
    -- Keep old values for backward compatibility with existing data
    'GRINDING',
    'POLISHING'
  ));

-- Update comment
COMMENT ON COLUMN line_polish_reports.activity IS 'Type of work: Various granite types (S/G, B/P, Burgandy) with different processes (Polishing, Laputra, Grinding, Polish Grinding, Laputra Grinding)';
