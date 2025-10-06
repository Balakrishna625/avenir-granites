-- =============================================
-- BLOCK_NO UPPERCASE ENFORCEMENT
-- Date: 2025-10-06
-- Purpose: Ensure all block numbers are stored in uppercase
-- =============================================

BEGIN;

-- Create a trigger function to enforce uppercase block_no
CREATE OR REPLACE FUNCTION enforce_uppercase_block_no()
RETURNS TRIGGER AS $$
BEGIN
    -- Convert block_no to uppercase automatically
    NEW.block_no = UPPER(NEW.block_no);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_uppercase_block_no ON granite_blocks;

-- Create trigger on granite_blocks table
CREATE TRIGGER trigger_uppercase_block_no
    BEFORE INSERT OR UPDATE ON granite_blocks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_uppercase_block_no();

-- Update existing block numbers to uppercase
UPDATE granite_blocks SET block_no = UPPER(block_no) WHERE block_no != UPPER(block_no);

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check that all block numbers are now uppercase:
-- SELECT block_no FROM granite_blocks WHERE block_no != UPPER(block_no);