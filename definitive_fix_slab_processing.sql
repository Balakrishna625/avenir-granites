-- =============================================
-- DEFINITIVE FIX FOR SLAB PROCESSING ERROR
-- Date: 2025-10-06
-- Purpose: FINAL fix for "record 'new' has no field 'consignment_id'" error
-- 
-- ROOT CAUSE: The update_consignment_totals() function from fix_elavance_calculation.sql
-- has complex logic that tries to access consignment_id on granite_block_parts table,
-- but granite_block_parts doesn't have a consignment_id field!
-- =============================================

BEGIN;

-- STEP 1: Remove ALL triggers from granite_block_parts that might reference consignment_id
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_block_totals ON granite_block_parts;

-- STEP 2: Create a SIMPLE trigger function ONLY for granite_block_parts
-- This function should ONLY update granite_blocks totals, nothing more
CREATE OR REPLACE FUNCTION update_block_totals_from_parts()
RETURNS TRIGGER AS $$
BEGIN
  -- Simply update the granite_blocks table with totals from granite_block_parts
  -- NO reference to consignment_id here!
  UPDATE granite_blocks 
  SET 
    total_sqft = (
      SELECT COALESCE(SUM(sqft), 0) 
      FROM granite_block_parts 
      WHERE block_id = COALESCE(NEW.block_id, OLD.block_id)
    ),
    total_slabs = (
      SELECT COALESCE(SUM(slabs_count), 0) 
      FROM granite_block_parts 
      WHERE block_id = COALESCE(NEW.block_id, OLD.block_id)
    )
  WHERE id = COALESCE(NEW.block_id, OLD.block_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Fix the problematic update_consignment_totals function 
-- Remove the complex total_sqft_produced calculation that causes the error
CREATE OR REPLACE FUNCTION update_consignment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- This function should ONLY be triggered by granite_blocks table changes
  -- where NEW and OLD have consignment_id field
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
    )
    -- REMOVED the problematic total_sqft_produced calculation that tried to access granite_block_parts
  WHERE id = COALESCE(NEW.consignment_id, OLD.consignment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Clean up and recreate triggers on correct tables ONLY
DROP TRIGGER IF EXISTS trigger_update_block_totals_from_parts ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;

-- Trigger ONLY on granite_block_parts - uses the simple function
CREATE TRIGGER trigger_update_block_totals_from_parts
  AFTER INSERT OR UPDATE OR DELETE ON granite_block_parts
  FOR EACH ROW EXECUTE FUNCTION update_block_totals_from_parts();

-- Trigger ONLY on granite_blocks - uses the fixed function
CREATE TRIGGER trigger_update_consignment_totals
  AFTER INSERT OR UPDATE OR DELETE ON granite_blocks
  FOR EACH ROW EXECUTE FUNCTION update_consignment_totals();

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- After running this, test by trying to add slab processing.
-- The error should be completely gone.
--
-- You can verify triggers with:
-- SELECT event_object_table, trigger_name, event_manipulation
-- FROM information_schema.triggers 
-- WHERE event_object_table IN ('granite_blocks', 'granite_block_parts')
-- ORDER BY event_object_table, trigger_name;