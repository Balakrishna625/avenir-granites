-- ============================================================================
-- FIX GRANITE_BLOCKS GENERATED COLUMNS
-- ============================================================================
-- This script removes any problematic generated columns that might be causing
-- insert errors, and recreates them properly
-- ============================================================================

-- First, check what columns exist
DO $$ 
DECLARE
    col_exists boolean;
BEGIN
    -- Check if total_elavance column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'granite_blocks' 
        AND column_name = 'total_elavance'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE 'Dropping total_elavance column (should not exist on granite_blocks)';
        ALTER TABLE granite_blocks DROP COLUMN IF EXISTS total_elavance CASCADE;
    END IF;
END $$;

-- Ensure elavance column is properly set as generated
DO $$ 
DECLARE
    col_exists boolean;
    is_generated boolean;
BEGIN
    -- Check if elavance column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'granite_blocks' 
        AND column_name = 'elavance'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE NOTICE 'Adding elavance as generated column';
        ALTER TABLE granite_blocks 
        ADD COLUMN elavance NUMERIC GENERATED ALWAYS AS (gross_measurement - net_measurement) STORED;
    ELSE
        -- Column exists, verify it's generated
        SELECT is_generated = 'ALWAYS' INTO is_generated
        FROM information_schema.columns
        WHERE table_name = 'granite_blocks' 
        AND column_name = 'elavance';
        
        IF NOT is_generated THEN
            RAISE NOTICE 'Recreating elavance as generated column';
            ALTER TABLE granite_blocks DROP COLUMN elavance CASCADE;
            ALTER TABLE granite_blocks 
            ADD COLUMN elavance NUMERIC GENERATED ALWAYS AS (gross_measurement - net_measurement) STORED;
        END IF;
    END IF;
END $$;

-- Ensure allowance column is properly set (if marker_measurement exists)
DO $$ 
DECLARE
    marker_exists boolean;
    allowance_exists boolean;
BEGIN
    -- Check if marker_measurement column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'granite_blocks' 
        AND column_name = 'marker_measurement'
    ) INTO marker_exists;
    
    IF marker_exists THEN
        -- Check if allowance exists
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'granite_blocks' 
            AND column_name = 'allowance'
        ) INTO allowance_exists;
        
        IF NOT allowance_exists THEN
            RAISE NOTICE 'Adding allowance as generated column';
            ALTER TABLE granite_blocks 
            ADD COLUMN allowance NUMERIC GENERATED ALWAYS AS (
                CASE WHEN marker_measurement IS NOT NULL THEN gross_measurement - marker_measurement ELSE NULL END
            ) STORED;
        END IF;
    END IF;
END $$;

-- List all columns in granite_blocks for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'granite_blocks'
ORDER BY ordinal_position;

RAISE NOTICE 'Generated columns fix completed. Check the output above to verify column structure.';
