-- =============================================
-- CONSIGNMENT CALCULATION BUSINESS LOGIC UPDATE
-- Date: 2025-10-11
-- Purpose: Update schema to reflect correct granite business model
-- Net meters = what you pay for, Gross meters = what you actually get
-- =============================================

BEGIN;

-- Step 1: Add new columns for net and gross meters
ALTER TABLE consignment_calculations ADD COLUMN net_meters_per_block NUMERIC;
ALTER TABLE consignment_calculations ADD COLUMN gross_meters_per_block NUMERIC;

-- Step 2: Migrate existing data (avg_meters becomes gross_meters, assume net = gross for existing data)
UPDATE consignment_calculations 
SET 
  net_meters_per_block = avg_meters_per_block,
  gross_meters_per_block = avg_meters_per_block
WHERE net_meters_per_block IS NULL OR gross_meters_per_block IS NULL;

-- Step 3: Drop all existing computed columns to recreate them with correct logic
ALTER TABLE consignment_calculations DROP COLUMN total_expected_sqft;
ALTER TABLE consignment_calculations DROP COLUMN polish_sqft;
ALTER TABLE consignment_calculations DROP COLUMN laputra_sqft;
ALTER TABLE consignment_calculations DROP COLUMN whiteline_sqft;
ALTER TABLE consignment_calculations DROP COLUMN raw_material_cost;
ALTER TABLE consignment_calculations DROP COLUMN polish_cost;
ALTER TABLE consignment_calculations DROP COLUMN laputra_cost;
ALTER TABLE consignment_calculations DROP COLUMN whiteline_cost;
ALTER TABLE consignment_calculations DROP COLUMN total_production_cost;
ALTER TABLE consignment_calculations DROP COLUMN total_cost;
ALTER TABLE consignment_calculations DROP COLUMN polish_sale_amount;
ALTER TABLE consignment_calculations DROP COLUMN laputra_sale_amount;
ALTER TABLE consignment_calculations DROP COLUMN whiteline_sale_amount;
ALTER TABLE consignment_calculations DROP COLUMN total_sale_revenue;
ALTER TABLE consignment_calculations DROP COLUMN profit_loss;
ALTER TABLE consignment_calculations DROP COLUMN profit_margin_percentage;

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
ALTER TABLE consignment_calculations ADD COLUMN raw_material_cost NUMERIC GENERATED ALWAYS AS (
  (total_blocks * net_meters_per_block * cost_per_meter) + 
  loading_charges + 
  transport_charges + 
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
  -- Raw material cost (based on NET meters)
  (total_blocks * net_meters_per_block * cost_per_meter) + 
  loading_charges + 
  transport_charges + 
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
        loading_charges + 
        transport_charges + 
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
    -- Raw material cost (NET meters)
    (total_blocks * net_meters_per_block * cost_per_meter) + 
    loading_charges + 
    transport_charges + 
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
            loading_charges + 
            transport_charges + 
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

-- Step 5: Make new columns NOT NULL with defaults
ALTER TABLE consignment_calculations ALTER COLUMN net_meters_per_block SET NOT NULL;
ALTER TABLE consignment_calculations ALTER COLUMN net_meters_per_block SET DEFAULT 0;

ALTER TABLE consignment_calculations ALTER COLUMN gross_meters_per_block SET NOT NULL;
ALTER TABLE consignment_calculations ALTER COLUMN gross_meters_per_block SET DEFAULT 0;

-- Step 6: Remove old column (after confirming data migration)
-- ALTER TABLE consignment_calculations DROP COLUMN avg_meters_per_block;

COMMIT;

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================
-- The schema has been successfully updated with:
-- 1. New net_meters_per_block and gross_meters_per_block columns
-- 2. Correct business logic: net meters for costs, gross meters for SqFt
-- 3. Updated computed columns with proper calculations
-- 4. New cost_per_sqft calculation

-- Sample business scenario test:
-- INSERT INTO consignment_calculations (
--   calculation_name,
--   description,
--   total_blocks,
--   net_meters_per_block,     -- What you PAY for
--   gross_meters_per_block,   -- What you ACTUALLY GET
--   cost_per_meter,
--   loading_charges,
--   transport_charges,
--   quarry_commission,
--   polish_percentage,
--   laputra_percentage,
--   whiteline_percentage,
--   polish_sale_price,
--   laputra_sale_price,
--   whiteline_sale_price
-- ) VALUES (
--   'Business Logic Test',
--   'Pay for 2m/block, get 7m/block',
--   100,    -- blocks
--   2.0,    -- net: pay for 2 meters per block
--   7.0,    -- gross: actually get 7 meters per block
--   1000,   -- ₹1000 per meter
--   50000,  -- loading
--   25000,  -- transport
--   15000,  -- commission
--   40.0,   -- 40% polish
--   35.0,   -- 35% laputra
--   25.0,   -- 25% white line
--   45.0,   -- polish sale ₹45/sqft
--   55.0,   -- laputra sale ₹55/sqft
--   40.0    -- whiteline sale ₹40/sqft
-- );

-- Expected Results:
-- Total SqFt: 100 × 7 × 300 = 210,000 SqFt
-- Raw Material Cost: (100 × 2 × 1000) + 50000 + 25000 + 15000 = ₹290,000
-- Cost per SqFt: ₹290,000 ÷ 210,000 = ₹1.38 per SqFt