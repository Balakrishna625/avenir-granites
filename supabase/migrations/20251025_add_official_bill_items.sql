-- Migration: Add official bill items to sales table
-- Store the official bill items as JSONB for flexibility

-- Add official_bill_items column to store array of official bill line items
ALTER TABLE sales ADD COLUMN IF NOT EXISTS official_bill_items JSONB DEFAULT '[]'::jsonb;

-- Add official_tax column
ALTER TABLE sales ADD COLUMN IF NOT EXISTS official_tax NUMERIC(15, 2) DEFAULT 0;

-- Add official_total column (calculated)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS official_total NUMERIC(15, 2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN sales.official_bill_items IS 'Official bill line items as JSON array [{material_name, square_feet, rate_per_sqft, total_amount}]';
COMMENT ON COLUMN sales.official_tax IS 'Tax amount in official bill';
COMMENT ON COLUMN sales.official_total IS 'Total of official bill (sum of items + official_tax)';
