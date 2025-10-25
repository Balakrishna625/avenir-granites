-- Migration: Add tonnage support to sales
-- Add tons field to track tonnage-based materials separately from square feet

-- Add tons column to sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tons NUMERIC(10, 3) DEFAULT 0;

-- Add rate_per_ton column to sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS rate_per_ton NUMERIC(10, 2) DEFAULT 0;

-- Add is_tonnage_material flag to sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS is_tonnage_material BOOLEAN DEFAULT false;

-- Add total_tons to sales table for summary
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_tons NUMERIC(10, 3) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN sale_items.tons IS 'Quantity in tons for tonnage-based materials';
COMMENT ON COLUMN sale_items.rate_per_ton IS 'Rate per ton for tonnage-based materials';
COMMENT ON COLUMN sale_items.is_tonnage_material IS 'Flag to indicate if this item is tonnage-based';
COMMENT ON COLUMN sales.total_tons IS 'Total tons sold (sum of all tonnage items)';
