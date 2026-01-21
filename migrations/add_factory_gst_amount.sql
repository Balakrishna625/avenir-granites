-- Add factory_gst_amount column to sales table
-- This stores 18% GST on factory mining amount for Only Bill mode

-- Add factory_gst_amount column
ALTER TABLE sales ADD COLUMN IF NOT EXISTS factory_gst_amount NUMERIC(15, 2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN sales.factory_gst_amount IS '18% GST calculated on factory mining amount for Only Bill entries';
