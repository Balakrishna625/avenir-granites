-- =============================================
-- Migration: Add marker_measurement & allowance
-- Date: 2025-10-01
-- Idempotent: YES (safe re-run)
-- =============================================

BEGIN;

-- 1. Add marker_measurement & allowance to granite_blocks
ALTER TABLE granite_blocks
  ADD COLUMN IF NOT EXISTS marker_measurement numeric,
  ADD COLUMN IF NOT EXISTS allowance numeric GENERATED ALWAYS AS (
    CASE WHEN marker_measurement IS NOT NULL THEN gross_measurement - marker_measurement ELSE NULL END
  ) STORED;

-- 2. Add marker-related aggregate/payment columns to granite_consignments
ALTER TABLE granite_consignments
  ADD COLUMN IF NOT EXISTS total_marker_measurement numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_allowance numeric GENERATED ALWAYS AS (total_gross_measurement - total_marker_measurement) STORED,
  ADD COLUMN IF NOT EXISTS total_payment_cash_marker numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_payment_upi_marker numeric DEFAULT 0;

-- 3. Backfill marker_measurement from net_measurement where still null
UPDATE granite_blocks
SET marker_measurement = net_measurement
WHERE marker_measurement IS NULL;

-- 4. Extend part_name constraint to allow 'C+D'
ALTER TABLE granite_block_parts
  DROP CONSTRAINT IF EXISTS granite_block_parts_part_name_check;
ALTER TABLE granite_block_parts
  ADD CONSTRAINT granite_block_parts_part_name_check
  CHECK (part_name IN ('A','B','C','C+D'));

-- 5. Update (replace) consignment totals function to also maintain marker aggregates
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

-- 6. Backfill marker aggregates for existing consignments
UPDATE granite_consignments gc
SET 
  total_marker_measurement = sub.total_marker,
  total_payment_cash_marker = sub.total_marker * gc.payment_cash_rate,
  total_payment_upi_marker = sub.total_marker * gc.payment_upi_rate
FROM (
  SELECT consignment_id, COALESCE(SUM(marker_measurement),0) AS total_marker
  FROM granite_blocks
  GROUP BY consignment_id
) sub
WHERE gc.id = sub.consignment_id;

COMMIT;

-- =============================
-- ROLLBACK (manual if needed):
--   ALTER TABLE granite_consignments DROP COLUMN total_marker_measurement, DROP COLUMN total_allowance, DROP COLUMN total_payment_cash_marker, DROP COLUMN total_payment_upi_marker;
--   ALTER TABLE granite_blocks DROP COLUMN marker_measurement, DROP COLUMN allowance;
--   ALTER TABLE granite_block_parts DROP CONSTRAINT granite_block_parts_part_name_check;
--   ALTER TABLE granite_block_parts ADD CONSTRAINT granite_block_parts_part_name_check CHECK (part_name IN ('A','B','C'));
-- Recreate previous version of update_consignment_totals() if you saved it.
-- =============================
