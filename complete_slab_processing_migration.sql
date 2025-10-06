-- =============================================
-- COMPREHENSIVE DATABASE MIGRATION FOR SLAB PROCESSING
-- Date: 2025-10-06
-- Purpose: Fix all database schema issues for slab processing functionality
-- =============================================

BEGIN;

-- 1. Add missing 'status' column to granite_block_parts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_block_parts' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE granite_block_parts 
        ADD COLUMN status text DEFAULT 'PRODUCED' 
        CHECK (status IN ('PRODUCED', 'READY', 'SOLD', 'DEFECTIVE'));
        
        -- Update existing records to have PRODUCED status
        UPDATE granite_block_parts 
        SET status = 'PRODUCED' 
        WHERE status IS NULL;
    END IF;
END $$;

-- 2. Update part_name constraint to include 'D' part
DO $$
BEGIN
    -- Drop existing constraint
    ALTER TABLE granite_block_parts DROP CONSTRAINT IF EXISTS granite_block_parts_part_name_check;
    
    -- Add new constraint with A, B, C, D
    ALTER TABLE granite_block_parts 
    ADD CONSTRAINT granite_block_parts_part_name_check 
    CHECK (part_name IN ('A', 'B', 'C', 'D'));
END $$;

-- 3. Ensure total_sqft_produced column exists in granite_blocks (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_blocks' 
        AND column_name = 'total_sqft_produced'
    ) THEN
        ALTER TABLE granite_blocks 
        ADD COLUMN total_sqft_produced numeric DEFAULT 0;
        
        -- Update with current calculated values
        UPDATE granite_blocks 
        SET total_sqft_produced = COALESCE(total_sqft, 0);
    END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS granite_block_parts_status_idx ON granite_block_parts(status);
CREATE INDEX IF NOT EXISTS granite_blocks_status_idx ON granite_blocks(status);

-- 5. Create or replace the uppercase block number trigger function
CREATE OR REPLACE FUNCTION enforce_uppercase_block_no()
RETURNS TRIGGER AS $$
BEGIN
    NEW.block_no = UPPER(NEW.block_no);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Ensure uppercase block number trigger exists
DROP TRIGGER IF EXISTS trigger_uppercase_block_no ON granite_blocks;
CREATE TRIGGER trigger_uppercase_block_no
    BEFORE INSERT OR UPDATE ON granite_blocks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_uppercase_block_no();

-- 7. Convert total_elavance to computed column if not already done
DO $$
BEGIN
    -- Check if total_elavance is already a computed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' 
        AND column_name = 'total_elavance'
        AND is_generated = 'ALWAYS'
    ) THEN
        -- Drop the column if it exists as a regular column
        ALTER TABLE granite_consignments DROP COLUMN IF EXISTS total_elavance;
        
        -- Add as computed column
        ALTER TABLE granite_consignments 
        ADD COLUMN total_elavance numeric 
        GENERATED ALWAYS AS (total_gross_measurement - total_net_measurement) STORED;
    END IF;
END $$;

-- 8. Update all existing block numbers to uppercase
UPDATE granite_blocks SET block_no = UPPER(block_no) WHERE block_no != UPPER(block_no);

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these after the migration to verify everything is working:

-- 1. Check granite_block_parts table structure
-- \d granite_block_parts

-- 2. Verify status column exists and has correct values
-- SELECT status, COUNT(*) FROM granite_block_parts GROUP BY status;

-- 3. Check that part_name constraint allows A, B, C, D
-- SELECT DISTINCT part_name FROM granite_block_parts ORDER BY part_name;

-- 4. Verify block numbers are uppercase
-- SELECT block_no FROM granite_blocks WHERE block_no != UPPER(block_no);

-- 5. Check computed column for elavance
-- SELECT consignment_number, total_gross_measurement, total_net_measurement, total_elavance 
-- FROM granite_consignments LIMIT 5;

-- Migration completed successfully!