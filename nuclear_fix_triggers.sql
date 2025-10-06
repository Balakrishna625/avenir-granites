-- =============================================
-- NUCLEAR OPTION: COMPLETE TRIGGER RESET
-- Date: 2025-10-06
-- Purpose: Remove ALL triggers and functions, rebuild only what's needed
-- WARNING: This will remove all triggers and rebuild them from scratch
-- =============================================

BEGIN;

-- STEP 1: DROP ALL TRIGGERS ON ALL GRANITE TABLES
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_block_totals ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_uppercase_block_no ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_block_totals_from_parts ON granite_block_parts;
DROP TRIGGER IF EXISTS trigger_update_block_totals_simple ON granite_block_parts;

DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;
DROP TRIGGER IF EXISTS trigger_update_block_totals ON granite_blocks;
DROP TRIGGER IF EXISTS trigger_uppercase_block_no ON granite_blocks;

DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_consignments;

-- STEP 2: DROP ALL FUNCTIONS THAT MIGHT CAUSE ISSUES
DROP FUNCTION IF EXISTS update_consignment_totals() CASCADE;
DROP FUNCTION IF EXISTS update_block_totals() CASCADE;
DROP FUNCTION IF EXISTS update_block_totals_simple() CASCADE;
DROP FUNCTION IF EXISTS update_block_totals_from_parts() CASCADE;

-- STEP 3: CREATE MINIMAL, SAFE FUNCTIONS

-- Simple function for uppercase block numbers (ONLY for granite_blocks)
CREATE OR REPLACE FUNCTION enforce_uppercase_block_no()
RETURNS TRIGGER AS $$
BEGIN
    NEW.block_no = UPPER(NEW.block_no);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Simple function to update block totals when parts change
CREATE OR REPLACE FUNCTION safe_update_block_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is ONLY called from granite_block_parts
  -- It ONLY updates granite_blocks, nothing else
  UPDATE granite_blocks 
  SET 
    total_sqft = COALESCE((
      SELECT SUM(sqft) 
      FROM granite_block_parts 
      WHERE block_id = COALESCE(NEW.block_id, OLD.block_id)
    ), 0),
    total_slabs = COALESCE((
      SELECT SUM(slabs_count) 
      FROM granite_block_parts 
      WHERE block_id = COALESCE(NEW.block_id, OLD.block_id)
    ), 0)
  WHERE id = COALESCE(NEW.block_id, OLD.block_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- STEP 4: CREATE ONLY ESSENTIAL TRIGGERS

-- Drop existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_uppercase_block_no ON granite_blocks;
DROP TRIGGER IF EXISTS trigger_safe_update_block_totals ON granite_block_parts;

-- Uppercase trigger ONLY on granite_blocks
CREATE TRIGGER trigger_uppercase_block_no
    BEFORE INSERT OR UPDATE ON granite_blocks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_uppercase_block_no();

-- Block totals trigger ONLY on granite_block_parts
CREATE TRIGGER trigger_safe_update_block_totals
    AFTER INSERT OR UPDATE OR DELETE ON granite_block_parts
    FOR EACH ROW
    EXECUTE FUNCTION safe_update_block_totals();

-- DO NOT CREATE ANY CONSIGNMENT TOTALS TRIGGER FOR NOW
-- This will allow slab processing to work without any consignment_id errors

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- After running this, check what triggers exist:
-- SELECT event_object_table, trigger_name FROM information_schema.triggers 
-- WHERE event_object_table IN ('granite_blocks', 'granite_block_parts');
--
-- There should be only 2 triggers:
-- granite_blocks: trigger_uppercase_block_no
-- granite_block_parts: trigger_safe_update_block_totals