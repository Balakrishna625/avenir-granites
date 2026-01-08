-- Migration: Update consignment structure for net measurement
-- Date: 2026-01-08
-- Purpose: Move net measurement to consignment level and auto-calculate purchase cost
-- =============================================

BEGIN;

-- Step 1: Add consignment-level net measurement column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'net_measurement'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN net_measurement NUMERIC DEFAULT 0;
        COMMENT ON COLUMN granite_consignments.net_measurement IS 'Single net measurement value for all blocks in this consignment';
    END IF;
END $$;

-- Step 2: Migrate existing data - sum of all block net measurements to consignment level
-- This preserves existing data
UPDATE granite_consignments
SET net_measurement = total_net_measurement
WHERE net_measurement IS NULL OR net_measurement = 0;

-- Step 3: Make net_measurement nullable on granite_blocks (we'll keep the column for backward compatibility but won't use it)
-- Don't drop the column to avoid data loss, just mark it as deprecated
COMMENT ON COLUMN granite_blocks.net_measurement IS 'DEPRECATED: Net measurement is now tracked at consignment level. This column kept for backward compatibility only.';

-- Step 4: Add purchase cost rate column to granite_consignments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'purchase_cost_rate'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN purchase_cost_rate NUMERIC DEFAULT 18000;
        COMMENT ON COLUMN granite_consignments.purchase_cost_rate IS 'Rate per cubic meter for purchase cost calculation (21000 for Gokanakonda, 18000 for others)';
    END IF;
END $$;

-- Step 5: Update purchase_cost_rate based on quarry_name for existing records
UPDATE granite_consignments
SET purchase_cost_rate = CASE 
    WHEN quarry_name = 'Gokanakonda' THEN 21000
    ELSE 18000
END
WHERE purchase_cost_rate = 18000 OR purchase_cost_rate IS NULL;

-- Step 6: Create function to auto-calculate purchase cost
CREATE OR REPLACE FUNCTION calculate_purchase_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate purchase cost based on net measurement and rate
  NEW.purchase_cost = (NEW.net_measurement * NEW.purchase_cost_rate);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-calculate purchase cost on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_purchase_cost ON granite_consignments;
CREATE TRIGGER trigger_calculate_purchase_cost
  BEFORE INSERT OR UPDATE OF net_measurement, purchase_cost_rate
  ON granite_consignments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_purchase_cost();

-- Step 8: Recalculate purchase costs for existing consignments
UPDATE granite_consignments
SET net_measurement = net_measurement -- Trigger the update to recalculate purchase_cost
WHERE id IS NOT NULL;

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- Uncomment to verify the migration:
-- SELECT 
--   consignment_number,
--   quarry_name,
--   net_measurement,
--   purchase_cost_rate,
--   purchase_cost,
--   (net_measurement * purchase_cost_rate) as calculated_cost
-- FROM granite_consignments
-- ORDER BY purchase_date DESC
-- LIMIT 10;
