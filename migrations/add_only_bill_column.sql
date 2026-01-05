-- Migration: Add only_bill column to sales table
-- Run this SQL in your database to fix the "only_bill column not found" error

-- Add only_bill column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS only_bill BOOLEAN DEFAULT false;

-- Make customer_id nullable since bill-only sales don't require a customer
ALTER TABLE sales ALTER COLUMN customer_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN sales.only_bill IS 'True if this is a bill-only transaction (no actual sale) for mining audit purposes';
COMMENT ON COLUMN sales.customer_id IS 'Customer reference - nullable for bill-only transactions';
