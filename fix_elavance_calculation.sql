-- =============================================
-- COMPLETE FIX: Total Elavance Calculation
-- Date: 2025-10-06
-- Purpose: Fix total_elavance to calculate as gross - net automatically
-- =============================================

BEGIN;

-- Step 1: Add missing columns first
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS total_sqft_produced NUMERIC DEFAULT 0;

-- Step 2: Drop the old trigger to avoid conflicts during schema changes
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;

-- Step 3: Check if total_elavance exists and drop it if it's not a computed column
DO $$
BEGIN
    -- Drop the existing total_elavance column if it exists (to recreate as computed)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'granite_consignments' AND column_name = 'total_elavance') THEN
        ALTER TABLE granite_consignments DROP COLUMN total_elavance;
    END IF;
END $$;

-- Step 4: Add total_elavance as a computed column (automatically calculates gross - net)
ALTER TABLE granite_consignments 
  ADD COLUMN total_elavance NUMERIC GENERATED ALWAYS AS (total_gross_measurement - total_net_measurement) STORED;

-- Step 5: Ensure other required columns exist
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS consignment_number TEXT;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS arrival_date DATE;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS payment_cash_rate NUMERIC DEFAULT 0;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS payment_upi_rate NUMERIC DEFAULT 0;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS transport_cost NUMERIC DEFAULT 0;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS total_blocks INTEGER DEFAULT 0;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS total_net_measurement NUMERIC DEFAULT 0;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS total_gross_measurement NUMERIC DEFAULT 0;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Step 6: Add marker measurement columns
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS total_marker_measurement NUMERIC DEFAULT 0;

-- Check if total_allowance exists and drop it if it's not a computed column  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'granite_consignments' AND column_name = 'total_allowance') THEN
        ALTER TABLE granite_consignments DROP COLUMN total_allowance;
    END IF;
END $$;

-- Add total_allowance as computed column
ALTER TABLE granite_consignments 
  ADD COLUMN total_allowance NUMERIC GENERATED ALWAYS AS (total_gross_measurement - total_marker_measurement) STORED;

ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS total_payment_cash_marker NUMERIC DEFAULT 0;
ALTER TABLE granite_consignments ADD COLUMN IF NOT EXISTS total_payment_upi_marker NUMERIC DEFAULT 0;

-- Step 7: Add marker measurement to granite_blocks if missing
ALTER TABLE granite_blocks ADD COLUMN IF NOT EXISTS marker_measurement NUMERIC;

-- Check if allowance exists in granite_blocks and drop it if not computed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'granite_blocks' AND column_name = 'allowance') THEN
        ALTER TABLE granite_blocks DROP COLUMN allowance;
    END IF;
END $$;

-- Add allowance as computed column to granite_blocks
ALTER TABLE granite_blocks
  ADD COLUMN allowance NUMERIC GENERATED ALWAYS AS (
    CASE WHEN marker_measurement IS NOT NULL THEN gross_measurement - marker_measurement ELSE NULL END
  ) STORED;

-- Step 8: Create the updated trigger function
CREATE OR REPLACE FUNCTION update_consignment_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE granite_consignments 
  SET 
    total_blocks = (
      SELECT COUNT(*) 
      FROM granite_blocks 
      WHERE consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_net_measurement = (
      SELECT COALESCE(SUM(net_measurement), 0) 
      FROM granite_blocks 
      WHERE consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_gross_measurement = (
      SELECT COALESCE(SUM(gross_measurement), 0) 
      FROM granite_blocks 
      WHERE consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_marker_measurement = (
      SELECT COALESCE(SUM(marker_measurement), 0) 
      FROM granite_blocks 
      WHERE consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_sqft_produced = (
      SELECT COALESCE(
        (SELECT SUM(gbp.sqft) FROM granite_block_parts gbp 
          INNER JOIN granite_blocks gb ON gbp.block_id = gb.id
          WHERE gb.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
        ) +
        (SELECT COALESCE(SUM(gam.sqft),0) FROM granite_additional_materials gam 
          WHERE gam.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
        )
      ,0)
    )
    -- Note: total_elavance and total_allowance calculate automatically as computed columns
  WHERE id = COALESCE(NEW.consignment_id, OLD.consignment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 9: Recreate the trigger
CREATE TRIGGER trigger_update_consignment_totals
  AFTER INSERT OR UPDATE OR DELETE ON granite_blocks
  FOR EACH ROW EXECUTE FUNCTION update_consignment_totals();

-- Step 10: Backfill existing data
UPDATE granite_blocks
SET marker_measurement = net_measurement
WHERE marker_measurement IS NULL;

-- Step 11: Update existing consignment totals to trigger the computed columns
UPDATE granite_consignments gc
SET 
  total_blocks = (SELECT COUNT(*) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_net_measurement = (SELECT COALESCE(SUM(net_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_gross_measurement = (SELECT COALESCE(SUM(gross_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_marker_measurement = (SELECT COALESCE(SUM(marker_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_sqft_produced = 0  -- Initialize to 0, will be calculated by future operations
WHERE gc.id IS NOT NULL;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES (run these to verify the fix)
-- =============================================

-- Check that total_elavance is now a computed column
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'granite_consignments' AND column_name IN ('total_elavance', 'total_allowance')
-- ORDER BY column_name;

-- Test elavance calculation
-- SELECT id, total_net_measurement, total_gross_measurement, total_elavance,
--        (total_gross_measurement - total_net_measurement) AS calculated_elavance
-- FROM granite_consignments 
-- WHERE id IS NOT NULL
-- LIMIT 5;