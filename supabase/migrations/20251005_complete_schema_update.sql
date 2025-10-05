-- =============================================
-- Complete Schema Update for Granite Ledger
-- Date: 2025-10-05
-- Purpose: Sync database schema with current application
-- =============================================

BEGIN;

-- =============================================
-- 1. UPDATE GRANITE_CONSIGNMENTS TABLE
-- =============================================

-- Add missing columns to granite_consignments (PostgreSQL syntax)
ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS consignment_number TEXT;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS supplier_id TEXT;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS arrival_date DATE;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS payment_cash_rate NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS payment_upi_rate NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS transport_cost NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS total_blocks INTEGER DEFAULT 0;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS total_net_measurement NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS total_gross_measurement NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS total_elavance NUMERIC GENERATED ALWAYS AS (total_gross_measurement - total_net_measurement) STORED;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS total_sqft_produced NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Add marker measurement columns to granite_consignments (from your migration)
ALTER TABLE granite_consignments
  ADD COLUMN IF NOT EXISTS total_marker_measurement NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments
  ADD COLUMN IF NOT EXISTS total_allowance NUMERIC GENERATED ALWAYS AS (total_gross_measurement - total_marker_measurement) STORED;

ALTER TABLE granite_consignments
  ADD COLUMN IF NOT EXISTS total_payment_cash_marker NUMERIC DEFAULT 0;

ALTER TABLE granite_consignments
  ADD COLUMN IF NOT EXISTS total_payment_upi_marker NUMERIC DEFAULT 0;

-- =============================================
-- 2. UPDATE GRANITE_BLOCKS TABLE  
-- =============================================

-- Add marker measurement columns to granite_blocks (from your migration)
ALTER TABLE granite_blocks
  ADD COLUMN IF NOT EXISTS marker_measurement NUMERIC,
  ADD COLUMN IF NOT EXISTS allowance NUMERIC GENERATED ALWAYS AS (
    CASE WHEN marker_measurement IS NOT NULL THEN gross_measurement - marker_measurement ELSE NULL END
  ) STORED;

-- =============================================
-- 3. CREATE/UPDATE GRANITE_SUPPLIERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS granite_suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. UPDATE GRANITE_BLOCK_PARTS CONSTRAINT
-- =============================================

-- Extend part_name constraint to allow 'C+D' (from your migration)
ALTER TABLE granite_block_parts
  DROP CONSTRAINT IF EXISTS granite_block_parts_part_name_check;
ALTER TABLE granite_block_parts
  ADD CONSTRAINT granite_block_parts_part_name_check
  CHECK (part_name IN ('A','B','C','C+D'));

-- =============================================
-- 5. CREATE/REPLACE TRIGGER FUNCTION
-- =============================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;

-- Create updated trigger function that matches current schema
CREATE OR REPLACE FUNCTION update_consignment_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE granite_consignments gc
  SET 
    total_blocks = (
      SELECT COUNT(*) FROM granite_blocks b WHERE b.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_net_measurement = (
      SELECT COALESCE(SUM(net_measurement),0) FROM granite_blocks b WHERE b.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_gross_measurement = (
      SELECT COALESCE(SUM(gross_measurement),0) FROM granite_blocks b WHERE b.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_marker_measurement = (
      SELECT COALESCE(SUM(marker_measurement),0) FROM granite_blocks b WHERE b.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_sqft_produced = (
      SELECT COALESCE(
        (SELECT SUM(gbp.sqft) FROM granite_block_parts gbp 
          INNER JOIN granite_blocks gb ON gbp.block_id = gb.id
          WHERE gb.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
        ) +
        (SELECT COALESCE(SUM(gam.sqft),0) FROM granite_additional_materials gam 
          WHERE gam.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
        )
      ,0)
    ),
    total_payment_cash_marker = (
      SELECT COALESCE(SUM(marker_measurement),0) * gc.payment_cash_rate
      FROM granite_blocks b WHERE b.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_payment_upi_marker = (
      SELECT COALESCE(SUM(marker_measurement),0) * gc.payment_upi_rate
      FROM granite_blocks b WHERE b.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    )
  WHERE gc.id = COALESCE(NEW.consignment_id, OLD.consignment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_consignment_totals
  AFTER INSERT OR UPDATE OR DELETE ON granite_blocks
  FOR EACH ROW EXECUTE FUNCTION update_consignment_totals();

-- =============================================
-- 6. BACKFILL DATA
-- =============================================

-- Backfill marker_measurement from net_measurement where still null (from your migration)
UPDATE granite_blocks
SET marker_measurement = net_measurement
WHERE marker_measurement IS NULL;

-- Backfill marker aggregates for existing consignments (from your migration)
UPDATE granite_consignments gc
SET 
  total_marker_measurement = sub.total_marker,
  total_payment_cash_marker = sub.total_marker * COALESCE(gc.payment_cash_rate, 0),
  total_payment_upi_marker = sub.total_marker * COALESCE(gc.payment_upi_rate, 0)
FROM (
  SELECT consignment_id, COALESCE(SUM(marker_measurement),0) AS total_marker
  FROM granite_blocks
  WHERE consignment_id IS NOT NULL
  GROUP BY consignment_id
) sub
WHERE gc.id = sub.consignment_id;

-- Update totals for existing consignments
UPDATE granite_consignments gc
SET 
  total_blocks = (SELECT COUNT(*) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_net_measurement = (SELECT COALESCE(SUM(net_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_gross_measurement = (SELECT COALESCE(SUM(gross_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_sqft_produced = 0  -- Initialize to 0, will be calculated by future block operations
WHERE gc.id IS NOT NULL;

-- =============================================
-- 7. INSERT SAMPLE SUPPLIERS (if table is empty)
-- =============================================

INSERT INTO granite_suppliers (id, name, contact_person, email, phone) 
VALUES 
  ('supplier-1', 'Rising Sun Exports', 'Manager', 'manager@risingsun.com', '+91-9876543210'),
  ('supplier-2', 'Bargandy Quarry', 'Sales Head', 'sales@bargandy.com', '+91-9876543211'),
  ('supplier-3', 'Local Granite Quarry', 'Owner', 'owner@localquarry.com', '+91-9876543212')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES (run these after the migration)
-- =============================================

-- Check granite_consignments columns
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'granite_consignments' ORDER BY ordinal_position;

-- Check granite_blocks columns  
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'granite_blocks' ORDER BY ordinal_position;

-- Check suppliers
-- SELECT * FROM granite_suppliers;

-- =============================================
-- ROLLBACK (if needed):
-- =============================================
-- ALTER TABLE granite_consignments DROP COLUMN IF EXISTS consignment_number, DROP COLUMN IF EXISTS supplier_id, DROP COLUMN IF EXISTS arrival_date, DROP COLUMN IF EXISTS payment_cash_rate, DROP COLUMN IF EXISTS payment_upi_rate, DROP COLUMN IF EXISTS transport_cost, DROP COLUMN IF EXISTS notes, DROP COLUMN IF EXISTS total_blocks, DROP COLUMN IF EXISTS total_net_measurement, DROP COLUMN IF EXISTS total_gross_measurement, DROP COLUMN IF EXISTS total_elavance, DROP COLUMN IF EXISTS total_sqft_produced, DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS total_marker_measurement, DROP COLUMN IF EXISTS total_allowance, DROP COLUMN IF EXISTS total_payment_cash_marker, DROP COLUMN IF EXISTS total_payment_upi_marker;
-- ALTER TABLE granite_blocks DROP COLUMN IF EXISTS marker_measurement, DROP COLUMN IF EXISTS allowance;
-- DROP TABLE IF EXISTS granite_suppliers;
-- =============================================