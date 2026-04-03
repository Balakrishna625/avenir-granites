-- Add column to track if payable amount was manually adjusted
ALTER TABLE contractor_payments 
ADD COLUMN IF NOT EXISTS manually_adjusted BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN contractor_payments.manually_adjusted IS 
  'TRUE if the payable amount was manually adjusted (overrides auto-calculation). FALSE to use auto-calculated values.';

-- For existing records, set manually_adjusted to TRUE for months before April 2026
-- (since those were manually entered)
UPDATE contractor_payments
SET manually_adjusted = TRUE
WHERE month < '2026-04';
