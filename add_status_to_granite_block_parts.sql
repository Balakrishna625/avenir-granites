-- =============================================
-- ADD STATUS COLUMN TO GRANITE_BLOCK_PARTS
-- Date: 2025-10-06
-- Purpose: Add missing 'status' column to granite_block_parts table
-- =============================================

BEGIN;

-- Add status column to granite_block_parts table
ALTER TABLE granite_block_parts 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'PRODUCED' 
CHECK (status IN ('PRODUCED', 'READY', 'SOLD', 'DEFECTIVE'));

-- Update existing records to have PRODUCED status
UPDATE granite_block_parts 
SET status = 'PRODUCED' 
WHERE status IS NULL;

-- Create index for status column for better performance
CREATE INDEX IF NOT EXISTS granite_block_parts_status_idx ON granite_block_parts(status);

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check that status column exists and has correct values:
-- SELECT status, COUNT(*) FROM granite_block_parts GROUP BY status;
-- 
-- Check table structure:
-- \d granite_block_parts;