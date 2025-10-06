-- =============================================
-- MINIMAL FIX FOR SLAB PROCESSING ERROR
-- Date: 2025-10-06  
-- Purpose: Quick fix for the "record 'new' has no field 'consignment_id'" error
-- =============================================

-- This is a minimal fix that just removes the problematic trigger logic
-- Run this if you need to quickly fix the slab processing error

BEGIN;

-- Remove any trigger on granite_block_parts that might be causing the issue
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_block_parts;

-- Simplify the consignment totals function to avoid the complex calculation
CREATE OR REPLACE FUNCTION update_consignment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update basic totals, avoid complex calculations that cause errors
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

COMMIT;