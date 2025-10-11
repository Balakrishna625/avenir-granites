-- =============================================
-- CONSIGNMENT CALCULATION SCHEMA
-- Date: 2025-10-11
-- Purpose: Create table for consignment cost calculations and estimations
-- =============================================

BEGIN;

-- Create consignment_calculations table
CREATE TABLE IF NOT EXISTS consignment_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  calculation_name TEXT NOT NULL,
  description TEXT,
  
  -- Raw Material Inputs
  total_blocks INTEGER NOT NULL DEFAULT 0,
  avg_meters_per_block NUMERIC NOT NULL DEFAULT 0,
  cost_per_meter NUMERIC NOT NULL DEFAULT 0,
  loading_charges NUMERIC DEFAULT 0,
  transport_charges NUMERIC DEFAULT 0,
  quarry_commission NUMERIC DEFAULT 0,
  
  -- Production Percentages
  polish_percentage NUMERIC DEFAULT 0 CHECK (polish_percentage >= 0 AND polish_percentage <= 100),
  laputra_percentage NUMERIC DEFAULT 0 CHECK (laputra_percentage >= 0 AND laputra_percentage <= 100),
  whiteline_percentage NUMERIC DEFAULT 0 CHECK (whiteline_percentage >= 0 AND whiteline_percentage <= 100),
  
  -- Computed Values (calculated automatically)
  total_expected_sqft NUMERIC GENERATED ALWAYS AS (total_blocks * avg_meters_per_block * 300) STORED,
  polish_sqft NUMERIC GENERATED ALWAYS AS (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100) STORED,
  laputra_sqft NUMERIC GENERATED ALWAYS AS (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100) STORED,
  whiteline_sqft NUMERIC GENERATED ALWAYS AS (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100) STORED,
  
  -- Cost Calculations
  raw_material_cost NUMERIC GENERATED ALWAYS AS (
    (total_blocks * avg_meters_per_block * cost_per_meter) + 
    loading_charges + 
    transport_charges + 
    quarry_commission
  ) STORED,
  
  polish_cost NUMERIC GENERATED ALWAYS AS (
    total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * 25
  ) STORED,
  
  laputra_cost NUMERIC GENERATED ALWAYS AS (
    total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * 30
  ) STORED,
  
  whiteline_cost NUMERIC GENERATED ALWAYS AS (
    total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * 25
  ) STORED,
  
  total_production_cost NUMERIC GENERATED ALWAYS AS (
    (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * 25) +
    (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * 30) +
    (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * 25)
  ) STORED,
  
  total_cost NUMERIC GENERATED ALWAYS AS (
    -- Raw material cost
    (total_blocks * avg_meters_per_block * cost_per_meter) + 
    loading_charges + 
    transport_charges + 
    quarry_commission +
    -- Production cost
    (total_blocks * avg_meters_per_block * 300 * polish_percentage / 100 * 25) +
    (total_blocks * avg_meters_per_block * 300 * laputra_percentage / 100 * 30) +
    (total_blocks * avg_meters_per_block * 300 * whiteline_percentage / 100 * 25)
  ) STORED,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS consignment_calculations_name_idx ON consignment_calculations(calculation_name);
CREATE INDEX IF NOT EXISTS consignment_calculations_created_at_idx ON consignment_calculations(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_consignment_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_consignment_calculations_updated_at ON consignment_calculations;
CREATE TRIGGER trigger_update_consignment_calculations_updated_at
    BEFORE UPDATE ON consignment_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_consignment_calculations_updated_at();

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check the table structure:
-- \d consignment_calculations

-- Sample data for testing:
-- INSERT INTO consignment_calculations (
--   calculation_name, 
--   description,
--   total_blocks, 
--   avg_meters_per_block, 
--   cost_per_meter, 
--   loading_charges, 
--   transport_charges, 
--   quarry_commission,
--   polish_percentage,
--   laputra_percentage,
--   whiteline_percentage
-- ) VALUES (
--   'Sample Calculation', 
--   'Test calculation for 100 blocks',
--   100, 
--   2.5, 
--   1000, 
--   50000, 
--   25000, 
--   15000,
--   10.0,
--   15.0,
--   5.0
-- );