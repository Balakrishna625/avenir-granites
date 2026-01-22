-- Add entry_type column to consignments table
-- This tracks whether the consignment came from: only_bill, sales, or job_work

-- Add entry_type column (nullable to support existing data)
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS entry_type TEXT;

-- Add comment
COMMENT ON COLUMN consignments.entry_type IS 'Type of entry that created this consignment: only_bill, sales, job_work, or NULL for legacy/unknown';

-- Optional: Add check constraint for valid values
ALTER TABLE consignments DROP CONSTRAINT IF EXISTS consignments_entry_type_check;
ALTER TABLE consignments ADD CONSTRAINT consignments_entry_type_check 
  CHECK (entry_type IS NULL OR entry_type IN ('only_bill', 'sales', 'job_work'));
