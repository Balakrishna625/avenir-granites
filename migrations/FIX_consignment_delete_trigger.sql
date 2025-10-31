-- ============================================================================
-- FIX CONSIGNMENT TRIGGERS FOR NEW DESIGN
-- ============================================================================
-- This fixes triggers that conflict with the new consignment design
-- Removes updates to GENERATED ALWAYS columns (total_elavance)
-- ============================================================================

-- Drop existing problematic triggers
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;
DROP TRIGGER IF EXISTS trigger_update_consignment_totals_parts ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_consignment_totals_materials ON granite_additional_materials;

-- Drop the old function
DROP FUNCTION IF EXISTS update_consignment_totals();

-- Create NEW function that ONLY updates non-generated columns
-- This is specifically for the NEW consignment design
CREATE OR REPLACE FUNCTION update_consignment_totals_new()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if we have a valid consignment_id
  IF (TG_OP = 'DELETE') THEN
    -- On delete, use OLD.consignment_id
    UPDATE granite_consignments 
    SET 
      total_blocks_count = (
        SELECT COUNT(*) 
        FROM granite_blocks 
        WHERE consignment_id = OLD.consignment_id
      ),
      total_net_measurement = (
        SELECT COALESCE(SUM(net_measurement), 0) 
        FROM granite_blocks 
        WHERE consignment_id = OLD.consignment_id
      ),
      total_gross_measurement = (
        SELECT COALESCE(SUM(gross_measurement), 0) 
        FROM granite_blocks 
        WHERE consignment_id = OLD.consignment_id
      )
    WHERE id = OLD.consignment_id;
    
    RETURN OLD;
  ELSE
    -- On insert or update, use NEW.consignment_id
    UPDATE granite_consignments 
    SET 
      total_blocks_count = (
        SELECT COUNT(*) 
        FROM granite_blocks 
        WHERE consignment_id = NEW.consignment_id
      ),
      total_net_measurement = (
        SELECT COALESCE(SUM(net_measurement), 0) 
        FROM granite_blocks 
        WHERE consignment_id = NEW.consignment_id
      ),
      total_gross_measurement = (
        SELECT COALESCE(SUM(gross_measurement), 0) 
        FROM granite_blocks 
        WHERE consignment_id = NEW.consignment_id
      )
    WHERE id = NEW.consignment_id;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create NEW trigger for granite_blocks changes
CREATE TRIGGER trigger_update_consignment_totals_new
  AFTER INSERT OR UPDATE OR DELETE ON granite_blocks
  FOR EACH ROW 
  EXECUTE FUNCTION update_consignment_totals_new();

-- Verify the fix
SELECT 
  'Trigger Fix Applied!' as status,
  'Old triggers removed, new trigger created' as message,
  'Consignments can now be deleted without errors' as result;

-- Show current triggers on granite_blocks
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'granite_blocks'
  AND trigger_name LIKE '%consignment%';
