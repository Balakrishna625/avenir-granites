-- =============================================
-- SIMPLE FIX FOR SLAB PROCESSING TRIGGER ERROR
-- Date: 2025-10-06
-- Purpose: Fix the consignment_id field error in granite_block_parts trigger
-- =============================================

BEGIN;

-- The issue is in the update_consignment_totals trigger function
-- It has complex logic that tries to access consignment_id on granite_block_parts
-- Let's simplify it to fix the immediate error

CREATE OR REPLACE FUNCTION update_consignment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- This function should only be triggered by granite_blocks table changes
  -- It should NOT be triggered by granite_block_parts changes
  
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
    -- Removed the complex total_sqft_produced calculation that was causing issues
  WHERE id = COALESCE(NEW.consignment_id, OLD.consignment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Ensure this trigger is ONLY on granite_blocks, not granite_block_parts
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;

CREATE TRIGGER trigger_update_consignment_totals
  AFTER INSERT OR UPDATE OR DELETE ON granite_blocks
  FOR EACH ROW EXECUTE FUNCTION update_consignment_totals();

-- Create a simpler function just for updating block totals from granite_block_parts
CREATE OR REPLACE FUNCTION update_block_totals_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Update granite_blocks totals when granite_block_parts changes
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

-- Ensure clean trigger setup for granite_block_parts
DROP TRIGGER IF EXISTS trigger_update_block_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_block_totals_simple ON granite_block_parts;

CREATE TRIGGER trigger_update_block_totals_simple
  AFTER INSERT OR UPDATE OR DELETE ON granite_block_parts
  FOR EACH ROW EXECUTE FUNCTION update_block_totals_simple();

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check triggers are properly assigned:
-- SELECT event_object_table, trigger_name 
-- FROM information_schema.triggers 
-- WHERE event_object_table IN ('granite_blocks', 'granite_block_parts')
-- ORDER BY event_object_table;