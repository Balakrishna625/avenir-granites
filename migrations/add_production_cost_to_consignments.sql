-- Add production_cost_per_sqft to granite_consignments
-- This allows tracking manufacturing/processing costs separately from raw material costs

BEGIN;

-- Add production_cost_per_sqft column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'production_cost_per_sqft'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN production_cost_per_sqft NUMERIC DEFAULT 0;
        COMMENT ON COLUMN granite_consignments.production_cost_per_sqft IS 'Manufacturing/processing cost per sqft (cutting, polishing, etc.)';
    END IF;
END $$;

-- Set default to 0 for existing consignments
UPDATE granite_consignments
SET production_cost_per_sqft = 0
WHERE production_cost_per_sqft IS NULL;

COMMIT;

-- Verification
SELECT 
    consignment_number,
    quarry_name,
    production_cost_per_sqft
FROM granite_consignments
ORDER BY purchase_date DESC
LIMIT 5;
