-- Migration: Add balance tracking to consignments table
-- This is needed for sales management to track payment status

-- Add payment_received column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consignments' AND column_name = 'payment_received'
  ) THEN
    ALTER TABLE consignments ADD COLUMN payment_received NUMERIC(15, 2) DEFAULT 0;
  END IF;
END $$;

-- Add balance column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consignments' AND column_name = 'balance'
  ) THEN
    ALTER TABLE consignments ADD COLUMN balance NUMERIC(15, 2) DEFAULT 0;
  END IF;
END $$;

-- Update existing consignments to set balance = total (for existing records)
UPDATE consignments 
SET 
  payment_received = COALESCE(payment_received, 0),
  balance = total - COALESCE(payment_received, 0)
WHERE balance IS NULL OR balance = 0;

-- Add comments
COMMENT ON COLUMN consignments.payment_received IS 'Total amount received from customer';
COMMENT ON COLUMN consignments.balance IS 'Outstanding balance (total - payment_received)';
