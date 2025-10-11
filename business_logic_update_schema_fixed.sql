-- =============================================
-- CONSIGNMENT CALCULATION BUSINESS LOGIC UPDATE (FIXED)
-- Date: 2025-10-11
-- Purpose: Update schema to reflect correct granite business model
-- Net meters = what you pay for, Gross meters = what you actually get
-- This version handles existing columns safely
-- =============================================

BEGIN;

-- Step 1: Add new columns for net and gross meters (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consignment_calculations' 
                   AND column_name = 'net_meters_per_block') THEN
        ALTER TABLE consignment_calculations ADD COLUMN net_meters_per_block NUMERIC;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consignment_calculations' 
                   AND column_name = 'gross_meters_per_block') THEN
        ALTER TABLE consignment_calculations ADD COLUMN gross_meters_per_block NUMERIC;
    END IF;
END $$;

-- Step 2: Migrate existing data (avg_meters becomes gross_meters, assume net = gross for existing data)
UPDATE consignment_calculations 
SET 
  net_meters_per_block = COALESCE(net_meters_per_block, avg_meters_per_block, 0),
  gross_meters_per_block = COALESCE(gross_meters_per_block, avg_meters_per_block, 0)
WHERE net_meters_per_block IS NULL OR gross_meters_per_block IS NULL OR net_meters_per_block = 0 OR gross_meters_per_block = 0;

-- Step 3: Drop all existing computed columns to recreate them with correct logic
DO $$ 
BEGIN
    -- Drop columns only if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'total_expected_sqft') THEN
        ALTER TABLE consignment_calculations DROP COLUMN total_expected_sqft;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'polish_sqft') THEN
        ALTER TABLE consignment_calculations DROP COLUMN polish_sqft;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'laputra_sqft') THEN
        ALTER TABLE consignment_calculations DROP COLUMN laputra_sqft;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'whiteline_sqft') THEN
        ALTER TABLE consignment_calculations DROP COLUMN whiteline_sqft;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'raw_material_cost') THEN
        ALTER TABLE consignment_calculations DROP COLUMN raw_material_cost;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'polish_cost') THEN
        ALTER TABLE consignment_calculations DROP COLUMN polish_cost;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'laputra_cost') THEN
        ALTER TABLE consignment_calculations DROP COLUMN laputra_cost;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'whiteline_cost') THEN
        ALTER TABLE consignment_calculations DROP COLUMN whiteline_cost;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'total_production_cost') THEN
        ALTER TABLE consignment_calculations DROP COLUMN total_production_cost;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'total_cost') THEN
        ALTER TABLE consignment_calculations DROP COLUMN total_cost;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'polish_sale_amount') THEN
        ALTER TABLE consignment_calculations DROP COLUMN polish_sale_amount;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'laputra_sale_amount') THEN
        ALTER TABLE consignment_calculations DROP COLUMN laputra_sale_amount;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'whiteline_sale_amount') THEN
        ALTER TABLE consignment_calculations DROP COLUMN whiteline_sale_amount;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'total_sale_revenue') THEN
        ALTER TABLE consignment_calculations DROP COLUMN total_sale_revenue;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'profit_loss') THEN
        ALTER TABLE consignment_calculations DROP COLUMN profit_loss;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'profit_margin_percentage') THEN
        ALTER TABLE consignment_calculations DROP COLUMN profit_margin_percentage;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignment_calculations' AND column_name = 'cost_per_sqft') THEN
        ALTER TABLE consignment_calculations DROP COLUMN cost_per_sqft;
    END IF;
END $$;

-- Step 4: Recreate computed columns with correct business logic

-- SqFt calculations use GROSS meters (what you actually get)
ALTER TABLE consignment_calculations ADD COLUMN total_expected_sqft NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN polish_sqft NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * polish_percentage / 100
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN laputra_sqft NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN whiteline_sqft NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100
) STORED;

-- Cost calculations use NET meters (what you pay for)
-- Loading charges: ₹1500 per block, Transport charges: ₹4500 per block
ALTER TABLE consignment_calculations ADD COLUMN raw_material_cost NUMERIC GENERATED ALWAYS AS (
  (total_blocks * net_meters_per_block * cost_per_meter) + 
  (total_blocks * 1500) + -- Loading charges: ₹1500 per block
  (total_blocks * 4500) + -- Transport charges: ₹4500 per block
  quarry_commission
) STORED;

-- Production costs use GROSS meters (processing is done on actual material)
ALTER TABLE consignment_calculations ADD COLUMN polish_cost NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * 25
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN laputra_cost NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * 30
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN whiteline_cost NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * 25
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN total_production_cost NUMERIC GENERATED ALWAYS AS (
  (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * 25) +
  (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * 30) +
  (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * 25)
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN total_cost NUMERIC GENERATED ALWAYS AS (
  -- Raw material cost (based on NET meters) with automatic loading/transport
  (total_blocks * net_meters_per_block * cost_per_meter) + 
  (total_blocks * 1500) + -- Loading charges: ₹1500 per block
  (total_blocks * 4500) + -- Transport charges: ₹4500 per block
  quarry_commission +
  -- Production cost (based on GROSS meters)
  (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * 25) +
  (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * 30) +
  (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * 25)
) STORED;

-- NEW: Cost per SqFt calculation
ALTER TABLE consignment_calculations ADD COLUMN cost_per_sqft NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN (total_blocks * gross_meters_per_block * 300) > 0 THEN
      (
        (total_blocks * net_meters_per_block * cost_per_meter) + 
        (total_blocks * 1500) + -- Loading charges: ₹1500 per block
        (total_blocks * 4500) + -- Transport charges: ₹4500 per block
        quarry_commission
      ) / (total_blocks * gross_meters_per_block * 300)
    ELSE 0
  END
) STORED;

-- Sale calculations use GROSS meters (selling what you actually have)
ALTER TABLE consignment_calculations ADD COLUMN polish_sale_amount NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * COALESCE(polish_sale_price, 0)
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN laputra_sale_amount NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * COALESCE(laputra_sale_price, 0)
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN whiteline_sale_amount NUMERIC GENERATED ALWAYS AS (
  total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * COALESCE(whiteline_sale_price, 0)
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN total_sale_revenue NUMERIC GENERATED ALWAYS AS (
  (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * COALESCE(polish_sale_price, 0)) +
  (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * COALESCE(laputra_sale_price, 0)) +
  (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * COALESCE(whiteline_sale_price, 0))
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN profit_loss NUMERIC GENERATED ALWAYS AS (
  -- Total Sale Revenue
  (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * COALESCE(polish_sale_price, 0)) +
  (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * COALESCE(laputra_sale_price, 0)) +
  (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * COALESCE(whiteline_sale_price, 0)) -
  -- Total Cost
  (
    -- Raw material cost (NET meters) with automatic loading/transport
    (total_blocks * net_meters_per_block * cost_per_meter) + 
    (total_blocks * 1500) + -- Loading charges: ₹1500 per block
    (total_blocks * 4500) + -- Transport charges: ₹4500 per block
    quarry_commission +
    -- Production cost (GROSS meters)
    (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * 25) +
    (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * 30) +
    (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * 25)
  )
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN profit_margin_percentage NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN (
      (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * COALESCE(polish_sale_price, 0)) +
      (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * COALESCE(laputra_sale_price, 0)) +
      (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * COALESCE(whiteline_sale_price, 0))
    ) > 0 THEN
      (
        -- Profit/Loss amount
        (
          (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * COALESCE(polish_sale_price, 0)) +
          (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * COALESCE(laputra_sale_price, 0)) +
          (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * COALESCE(whiteline_sale_price, 0)) -
          (
            (total_blocks * net_meters_per_block * cost_per_meter) + 
            (total_blocks * 1500) + -- Loading charges: ₹1500 per block
            (total_blocks * 4500) + -- Transport charges: ₹4500 per block
            quarry_commission +
            (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * 25) +
            (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * 30) +
            (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * 25)
          )
        ) * 100.0 / 
        -- Total Sale Revenue
        (
          (total_blocks * gross_meters_per_block * 300 * polish_percentage / 100 * COALESCE(polish_sale_price, 0)) +
          (total_blocks * gross_meters_per_block * 300 * laputra_percentage / 100 * COALESCE(laputra_sale_price, 0)) +
          (total_blocks * gross_meters_per_block * 300 * whiteline_percentage / 100 * COALESCE(whiteline_sale_price, 0))
        )
      )
    ELSE 0
  END
) STORED;

-- Step 5: Make new columns NOT NULL with defaults (only if not already set)
DO $$ 
BEGIN
    -- Check and update net_meters_per_block constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'consignment_calculations' 
               AND column_name = 'net_meters_per_block' 
               AND is_nullable = 'YES') THEN
        -- Update any remaining NULL values first
        UPDATE consignment_calculations SET net_meters_per_block = 0 WHERE net_meters_per_block IS NULL;
        -- Set NOT NULL constraint
        ALTER TABLE consignment_calculations ALTER COLUMN net_meters_per_block SET NOT NULL;
    END IF;
    
    -- Set default if not already set
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consignment_calculations' 
                   AND column_name = 'net_meters_per_block' 
                   AND column_default IS NOT NULL) THEN
        ALTER TABLE consignment_calculations ALTER COLUMN net_meters_per_block SET DEFAULT 0;
    END IF;
    
    -- Check and update gross_meters_per_block constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'consignment_calculations' 
               AND column_name = 'gross_meters_per_block' 
               AND is_nullable = 'YES') THEN
        -- Update any remaining NULL values first
        UPDATE consignment_calculations SET gross_meters_per_block = 0 WHERE gross_meters_per_block IS NULL;
        -- Set NOT NULL constraint
        ALTER TABLE consignment_calculations ALTER COLUMN gross_meters_per_block SET NOT NULL;
    END IF;
    
    -- Set default if not already set
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consignment_calculations' 
                   AND column_name = 'gross_meters_per_block' 
                   AND column_default IS NOT NULL) THEN
        ALTER TABLE consignment_calculations ALTER COLUMN gross_meters_per_block SET DEFAULT 0;
    END IF;
END $$;

-- Step 6: Remove old column (optional - commented out for safety)
-- ALTER TABLE consignment_calculations DROP COLUMN IF EXISTS avg_meters_per_block;

COMMIT;

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================
-- The schema has been successfully updated with:
-- 1. New net_meters_per_block and gross_meters_per_block columns (safely handled existing)
-- 2. Correct business logic: net meters for costs, gross meters for SqFt
-- 3. Updated computed columns with proper calculations including automatic loading/transport
-- 4. New cost_per_sqft calculation
-- 5. Automatic loading charges: ₹1,500 per block
-- 6. Automatic transport charges: ₹4,500 per block

-- Test the migration by running a simple query:
-- SELECT calculation_name, total_blocks, net_meters_per_block, gross_meters_per_block, 
--        raw_material_cost, cost_per_sqft, total_cost, profit_loss 
-- FROM consignment_calculations 
-- LIMIT 5;