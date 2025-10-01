-- Add missing columns to granite_consignments table if they don't exist
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN 
    -- Check and add total_sqft_produced column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'granite_consignments' 
                   AND column_name = 'total_sqft_produced') THEN
        ALTER TABLE granite_consignments 
        ADD COLUMN total_sqft_produced numeric DEFAULT 0;
    END IF;

    -- Check and add raw_material_cost_per_sqft column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'granite_consignments' 
                   AND column_name = 'raw_material_cost_per_sqft') THEN
        ALTER TABLE granite_consignments 
        ADD COLUMN raw_material_cost_per_sqft numeric GENERATED ALWAYS AS (
            CASE WHEN total_sqft_produced > 0 THEN total_expenditure / total_sqft_produced ELSE 0 END
        ) STORED;
    END IF;

    -- Check and add production_cost_per_sqft column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'granite_consignments' 
                   AND column_name = 'production_cost_per_sqft') THEN
        ALTER TABLE granite_consignments 
        ADD COLUMN production_cost_per_sqft numeric DEFAULT 40;
    END IF;

    -- Check and add total_cost_per_sqft column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'granite_consignments' 
                   AND column_name = 'total_cost_per_sqft') THEN
        ALTER TABLE granite_consignments 
        ADD COLUMN total_cost_per_sqft numeric GENERATED ALWAYS AS (
            raw_material_cost_per_sqft + production_cost_per_sqft
        ) STORED;
    END IF;

    RAISE NOTICE 'Missing columns have been added to granite_consignments table!';
END $$;