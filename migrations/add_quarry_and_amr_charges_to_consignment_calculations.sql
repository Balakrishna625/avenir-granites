-- Add quarry and amr_charges columns to consignment_calculations table
-- This migration adds support for selecting different quarries with different pricing

-- Add quarry column (required field with default value)
ALTER TABLE consignment_calculations 
ADD COLUMN IF NOT EXISTS quarry text NOT NULL DEFAULT 'Sambrajyam';

-- Add constraint to ensure quarry is one of the three valid options
ALTER TABLE consignment_calculations 
ADD CONSTRAINT consignment_calculations_quarry_check 
CHECK (quarry IN ('Sambrajyam', 'Sai Lakshmi', 'Gokana Konda'));

-- Add amr_charges column (only applicable for Gokana Konda, defaults to 0)
ALTER TABLE consignment_calculations 
ADD COLUMN IF NOT EXISTS amr_charges numeric(10,2) DEFAULT 0 CHECK (amr_charges >= 0);

-- Add comment for documentation
COMMENT ON COLUMN consignment_calculations.quarry IS 'Quarry selection: Sambrajyam, Sai Lakshmi, or Gokana Konda. Different quarries have different transport and loading charges.';
COMMENT ON COLUMN consignment_calculations.amr_charges IS 'AMR charges applicable only for Gokana Konda quarry. Defaults to 0 for other quarries.';

-- Update existing records to have default quarry (Sambrajyam) if null
UPDATE consignment_calculations 
SET quarry = 'Sambrajyam' 
WHERE quarry IS NULL;

-- Update existing records to have amr_charges = 0 if null
UPDATE consignment_calculations 
SET amr_charges = 0 
WHERE amr_charges IS NULL;
