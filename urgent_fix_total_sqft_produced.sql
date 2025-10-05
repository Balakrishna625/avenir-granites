-- =============================================
-- URGENT FIX: Resolve total_sqft_produced column error
-- Date: 2025-10-05
-- Purpose: Fix trigger function and ensure column exists
-- =============================================

BEGIN;

-- 1. First, add the missing column if it doesn't exist
ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS total_sqft_produced NUMERIC DEFAULT 0;

-- 2. Drop the old trigger to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;

-- 3. Create a SIMPLE trigger function that doesn't reference total_sqft_produced
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
    )
    -- Note: Removed total_sqft_produced calculation to avoid complex dependencies
  WHERE id = COALESCE(NEW.consignment_id, OLD.consignment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the trigger with the simple function
CREATE TRIGGER trigger_update_consignment_totals
  AFTER INSERT OR UPDATE OR DELETE ON granite_blocks
  FOR EACH ROW EXECUTE FUNCTION update_consignment_totals();

COMMIT;

-- Test the fix by checking if the column exists:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_sqft_produced';