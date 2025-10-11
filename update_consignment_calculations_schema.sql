-- =============================================
-- CONSIGNMENT CALCULATION SCHEMA UPDATE
-- Date: 2025-10-11
-- Purpose: Add expected sale price fields and profit/loss calculations
-- =============================================

BEGIN;

-- Add new columns for sale prices
ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS polish_sale_price NUMERIC DEFAULT 0;
ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS laputra_sale_price NUMERIC DEFAULT 0;
ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS whiteline_sale_price NUMERIC DEFAULT 0;

-- Add computed columns for sale amounts
ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS polish_sale_amount NUMERIC GENERATED ALWAYS AS (
  total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * polish_sale_price
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS laputra_sale_amount NUMERIC GENERATED ALWAYS AS (
  total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * laputra_sale_price
) STORED;

ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS whiteline_sale_amount NUMERIC GENERATED ALWAYS AS (
  total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * whiteline_sale_price
) STORED;

-- Add computed column for total sale revenue
ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS total_sale_revenue NUMERIC GENERATED ALWAYS AS (
  (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * polish_sale_price) +
  (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * laputra_sale_price) +
  (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * whiteline_sale_price)
) STORED;

-- Add computed column for profit/loss
ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS profit_loss NUMERIC GENERATED ALWAYS AS (
  -- Total Sale Revenue
  (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * polish_sale_price) +
  (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * laputra_sale_price) +
  (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * whiteline_sale_price) -
  -- Total Cost (Raw Material + Production)
  (
    -- Raw material cost
    (total_blocks * avg_meters_per_block * cost_per_meter) + 
    loading_charges + 
    transport_charges + 
    quarry_commission +
    -- Production cost
    (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * 25) +
    (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * 30) +
    (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * 25)
  )
) STORED;

-- Add computed column for profit margin percentage
ALTER TABLE consignment_calculations ADD COLUMN IF NOT EXISTS profit_margin_percentage NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN (
      (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * polish_sale_price) +
      (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * laputra_sale_price) +
      (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * whiteline_sale_price)
    ) > 0 THEN
      (
        -- Profit/Loss
        (
          (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * polish_sale_price) +
          (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * laputra_sale_price) +
          (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * whiteline_sale_price) -
          (
            (total_blocks * avg_meters_per_block * cost_per_meter) + 
            loading_charges + 
            transport_charges + 
            quarry_commission +
            (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * 25) +
            (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * 30) +
            (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * 25)
          )
        ) * 100.0 / 
        -- Total Sale Revenue
        (
          (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * polish_sale_price) +
          (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * laputra_sale_price) +
          (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * whiteline_sale_price)
        )
      )
    ELSE 0
  END
) STORED;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if new columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'consignment_calculations' 
AND column_name IN (
  'polish_sale_price', 
  'laputra_sale_price', 
  'whiteline_sale_price', 
  'polish_sale_amount', 
  'laputra_sale_amount', 
  'whiteline_sale_amount', 
  'total_sale_revenue', 
  'profit_loss', 
  'profit_margin_percentage'
)
ORDER BY column_name;

-- Sample data update for testing (optional)
-- UPDATE consignment_calculations 
-- SET 
--   polish_sale_price = 45,
--   laputra_sale_price = 55, 
--   whiteline_sale_price = 40
-- WHERE calculation_name = 'Sample Calculation';

-- Test query to see calculations working
-- SELECT 
--   calculation_name,
--   total_expected_sqft,
--   polish_sqft,
--   laputra_sqft,
--   whiteline_sqft,
--   polish_sale_price,
--   laputra_sale_price,
--   whiteline_sale_price,
--   polish_sale_amount,
--   laputra_sale_amount,
--   whiteline_sale_amount,
--   total_sale_revenue,
--   total_cost,
--   profit_loss,
--   profit_margin_percentage
-- FROM consignment_calculations
-- WHERE calculation_name = 'Sample Calculation';