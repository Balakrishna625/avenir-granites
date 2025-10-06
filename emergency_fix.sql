-- =============================================
-- EMERGENCY FIX: Stop the consignment_id error immediately
-- Date: 2025-10-06
-- Purpose: This is the simplest possible fix to stop the error
-- =============================================

-- The problem: There's likely a trigger on granite_block_parts that's calling
-- a function which tries to access NEW.consignment_id or OLD.consignment_id
-- but granite_block_parts doesn't have that field.

BEGIN;

-- SOLUTION 1: Remove ANY trigger on granite_block_parts that might cause this
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_block_parts;

-- SOLUTION 2: If there's still an issue, it might be the function itself
-- Let's create a version that won't fail when called from granite_block_parts
CREATE OR REPLACE FUNCTION update_consignment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we're being called from granite_blocks table (has consignment_id)
  -- or from granite_block_parts table (doesn't have consignment_id)
  
  IF TG_TABLE_NAME = 'granite_blocks' THEN
    -- Safe to use NEW.consignment_id and OLD.consignment_id
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
  END IF;
  
  -- If called from granite_block_parts, do nothing - no error
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- This should stop the error immediately by making the function safe
-- regardless of which table calls it.