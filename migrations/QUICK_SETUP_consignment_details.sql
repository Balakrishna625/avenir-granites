-- ============================================================================
-- QUICK SETUP: Run this in Supabase SQL Editor
-- ============================================================================
-- This script updates the consignment schema for the new Consignment Details feature
-- ============================================================================

BEGIN;

-- 1. Add new columns to granite_consignments table
DO $$ 
BEGIN
    -- Add quarry_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'quarry_name'
    ) THEN
        ALTER TABLE granite_consignments
        ADD COLUMN quarry_name TEXT CHECK (quarry_name IN ('Sai lakshmi', 'Sambrajyam', 'Burgandy', 'Gokanakonda', 'Ummadivaram'));
    END IF;

    -- Add purchase_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'purchase_date'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN purchase_date DATE;
    END IF;

    -- Add total_blocks_count column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'total_blocks_count'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN total_blocks_count INTEGER DEFAULT 0;
    END IF;

    -- Add purchase_cost column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'purchase_cost'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN purchase_cost NUMERIC DEFAULT 0;
    END IF;

    -- Add loading_cost column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'loading_cost'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN loading_cost NUMERIC DEFAULT 0;
    END IF;

    -- Add quarry_commission column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'quarry_commission'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN quarry_commission NUMERIC DEFAULT 0;
    END IF;

    -- Add other_charges column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'granite_consignments' AND column_name = 'other_charges'
    ) THEN
        ALTER TABLE granite_consignments ADD COLUMN other_charges NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 2. Update total_expenditure to include all new cost fields
ALTER TABLE granite_consignments DROP COLUMN IF EXISTS total_expenditure;

ALTER TABLE granite_consignments
ADD COLUMN total_expenditure NUMERIC GENERATED ALWAYS AS (
    COALESCE(purchase_cost, 0) + 
    COALESCE(transport_cost, 0) + 
    COALESCE(loading_cost, 0) + 
    COALESCE(quarry_commission, 0) + 
    COALESCE(other_charges, 0)
) STORED;

-- 3. Populate purchase_date from arrival_date for existing records
UPDATE granite_consignments
SET purchase_date = arrival_date
WHERE purchase_date IS NULL;

-- 4. Update total_blocks_count from actual blocks
UPDATE granite_consignments
SET total_blocks_count = (
    SELECT COUNT(*) 
    FROM granite_blocks gb 
    WHERE gb.consignment_id = granite_consignments.id
)
WHERE total_blocks_count = 0 OR total_blocks_count IS NULL;

-- 5. Populate quarry_name from supplier for existing records
UPDATE granite_consignments gc
SET quarry_name = CASE 
    WHEN gs.name IN ('Sai lakshmi', 'Sambrajyam', 'Burgandy', 'Gokanakonda', 'Ummadivaram') THEN gs.name
    ELSE NULL
END
FROM granite_suppliers gs
WHERE gc.supplier_id = gs.id AND gc.quarry_name IS NULL;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_granite_consignments_purchase_date 
ON granite_consignments(purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_granite_consignments_quarry_name 
ON granite_consignments(quarry_name);

-- 7. Insert quarry suppliers if they don't exist
INSERT INTO granite_suppliers (name, contact_person)
VALUES 
    ('Sai lakshmi', 'Contact Person'),
    ('Sambrajyam', 'Contact Person'),
    ('Burgandy', 'Contact Person'),
    ('Gokanakonda', 'Contact Person'),
    ('Ummadivaram', 'Contact Person')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check new columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns
WHERE table_name = 'granite_consignments'
AND column_name IN ('quarry_name', 'purchase_date', 'total_blocks_count', 
                    'purchase_cost', 'loading_cost', 'quarry_commission', 'other_charges')
ORDER BY column_name;

-- Verify quarry suppliers
SELECT id, name FROM granite_suppliers 
WHERE name IN ('Sai lakshmi', 'Sambrajyam', 'Burgandy', 'Gokanakonda', 'Ummadivaram')
ORDER BY name;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'granite_consignments'
AND indexname IN ('idx_granite_consignments_purchase_date', 'idx_granite_consignments_quarry_name');

SELECT 'Setup completed successfully!' as status;
