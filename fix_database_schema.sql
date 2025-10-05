-- =============================================
-- STEP 1: Check current granite_consignments columns
-- =============================================
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'granite_consignments' 
ORDER BY ordinal_position;

-- =============================================
-- STEP 2: Add missing columns one by one
-- =============================================

-- Basic consignment info columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'consignment_number') THEN
    ALTER TABLE granite_consignments ADD COLUMN consignment_number TEXT;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'supplier_id') THEN
    ALTER TABLE granite_consignments ADD COLUMN supplier_id TEXT;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'arrival_date') THEN
    ALTER TABLE granite_consignments ADD COLUMN arrival_date DATE;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'payment_cash_rate') THEN
    ALTER TABLE granite_consignments ADD COLUMN payment_cash_rate NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'payment_upi_rate') THEN
    ALTER TABLE granite_consignments ADD COLUMN payment_upi_rate NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'transport_cost') THEN
    ALTER TABLE granite_consignments ADD COLUMN transport_cost NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'notes') THEN
    ALTER TABLE granite_consignments ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Totals columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_blocks') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_blocks INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_net_measurement') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_net_measurement NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_gross_measurement') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_gross_measurement NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_elavance') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_elavance NUMERIC GENERATED ALWAYS AS (total_gross_measurement - total_net_measurement) STORED;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_sqft_produced') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_sqft_produced NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Marker measurement columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_marker_measurement') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_marker_measurement NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_allowance') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_allowance NUMERIC GENERATED ALWAYS AS (total_gross_measurement - total_marker_measurement) STORED;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_payment_cash_marker') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_payment_cash_marker NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_consignments' AND column_name = 'total_payment_upi_marker') THEN
    ALTER TABLE granite_consignments ADD COLUMN total_payment_upi_marker NUMERIC DEFAULT 0;
  END IF;
END $$;

-- =============================================
-- STEP 3: Add marker_measurement to granite_blocks
-- =============================================

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_blocks' AND column_name = 'marker_measurement') THEN
    ALTER TABLE granite_blocks ADD COLUMN marker_measurement NUMERIC;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'granite_blocks' AND column_name = 'allowance') THEN
    ALTER TABLE granite_blocks ADD COLUMN allowance NUMERIC GENERATED ALWAYS AS (
      CASE WHEN marker_measurement IS NOT NULL THEN gross_measurement - marker_measurement ELSE NULL END
    ) STORED;
  END IF;
END $$;

-- =============================================
-- STEP 4: Create granite_suppliers table
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
-- STEP 5: Drop and recreate the trigger function
-- =============================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_consignment_totals ON granite_blocks;

-- Create updated trigger function
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
    total_sqft_produced = COALESCE((
      SELECT SUM(gbp.sqft) FROM granite_block_parts gbp 
        INNER JOIN granite_blocks gb ON gbp.block_id = gb.id
        WHERE gb.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ), 0) + COALESCE((
      SELECT SUM(gam.sqft) FROM granite_additional_materials gam 
        WHERE gam.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ), 0),
    total_payment_cash_marker = (
      SELECT COALESCE(SUM(marker_measurement),0) * COALESCE(gc.payment_cash_rate, 0)
      FROM granite_blocks b WHERE b.consignment_id = COALESCE(NEW.consignment_id, OLD.consignment_id)
    ),
    total_payment_upi_marker = (
      SELECT COALESCE(SUM(marker_measurement),0) * COALESCE(gc.payment_upi_rate, 0)
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
-- STEP 6: Insert sample suppliers
-- =============================================

INSERT INTO granite_suppliers (id, name, contact_person, email, phone) 
VALUES 
  ('supplier-1', 'Rising Sun Exports', 'Manager', 'manager@risingsun.com', '+91-9876543210'),
  ('supplier-2', 'Bargandy Quarry', 'Sales Head', 'sales@bargandy.com', '+91-9876543211'),
  ('supplier-3', 'Local Granite Quarry', 'Owner', 'owner@localquarry.com', '+91-9876543212')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STEP 7: Backfill existing data
-- =============================================

-- Backfill marker_measurement with net_measurement where null
UPDATE granite_blocks
SET marker_measurement = net_measurement
WHERE marker_measurement IS NULL;

-- Update totals for existing consignments
UPDATE granite_consignments gc
SET 
  total_blocks = (SELECT COUNT(*) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_net_measurement = (SELECT COALESCE(SUM(net_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_gross_measurement = (SELECT COALESCE(SUM(gross_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_marker_measurement = (SELECT COALESCE(SUM(marker_measurement),0) FROM granite_blocks b WHERE b.consignment_id = gc.id),
  total_sqft_produced = 0
WHERE gc.id IS NOT NULL;

-- =============================================
-- STEP 8: Verify the schema
-- =============================================
SELECT 'granite_consignments columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'granite_consignments' 
ORDER BY ordinal_position;

SELECT 'granite_blocks columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'granite_blocks' 
ORDER BY ordinal_position;

SELECT 'granite_suppliers:' as info;
SELECT * FROM granite_suppliers;