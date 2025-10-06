-- =============================================
-- FIX TRIGGER ERROR FOR SLAB PROCESSING
-- Date: 2025-10-06
-- Purpose: Fix the "record 'new' has no field 'consignment_id'" error
-- =============================================

BEGIN;

-- 1. Drop all potentially problematic triggers on granite_block_parts
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_block_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_uppercase_block_no ON granite_block_parts;

-- 2. Drop and recreate the correct trigger functions

-- Function to update block totals (this should only work with granite_block_parts)
CREATE OR REPLACE FUNCTION update_block_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the granite_blocks table with totals from granite_block_parts
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

-- Function to update consignment totals (this should only work with granite_blocks)
CREATE OR REPLACE FUNCTION update_consignment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- This function should only be triggered by granite_blocks table changes
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
  WHERE id = COALESCE(NEW.consignment_id, OLD.consignment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Create triggers on the correct tables only

-- Drop existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_block_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;

-- Trigger on granite_block_parts to update granite_blocks totals
CREATE TRIGGER trigger_update_block_totals
  AFTER INSERT OR UPDATE OR DELETE ON granite_block_parts
  FOR EACH ROW EXECUTE FUNCTION update_block_totals();

-- Trigger on granite_blocks to update granite_consignments totals
CREATE TRIGGER trigger_update_consignment_totals
  AFTER INSERT OR UPDATE OR DELETE ON granite_blocks
  FOR EACH ROW EXECUTE FUNCTION update_consignment_totals();

-- 4. Ensure uppercase block number trigger is only on granite_blocks (not granite_block_parts)
CREATE OR REPLACE FUNCTION enforce_uppercase_block_no()
RETURNS TRIGGER AS $$
BEGIN
    NEW.block_no = UPPER(NEW.block_no);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_uppercase_block_no ON granite_blocks;
CREATE TRIGGER trigger_uppercase_block_no
    BEFORE INSERT OR UPDATE ON granite_blocks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_uppercase_block_no();

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check that triggers are correctly assigned:
-- 
-- SELECT event_object_table, trigger_name, event_manipulation
-- FROM information_schema.triggers 
-- WHERE event_object_table IN ('granite_blocks', 'granite_block_parts', 'granite_consignments')
-- ORDER BY event_object_table, trigger_name;