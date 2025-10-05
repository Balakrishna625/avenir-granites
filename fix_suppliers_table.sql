-- =============================================
-- Fix granite_suppliers table schema
-- =============================================

-- First, let's check the current granite_suppliers table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'granite_suppliers' 
ORDER BY ordinal_position;

-- Add missing email column if it doesn't exist
ALTER TABLE granite_suppliers 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add missing address column if it doesn't exist  
ALTER TABLE granite_suppliers 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Now insert the sample suppliers (this should work now)
INSERT INTO granite_suppliers (id, name, contact_person, email, phone) 
VALUES 
  ('supplier-1', 'Rising Sun Exports', 'Manager', 'manager@risingsun.com', '+91-9876543210'),
  ('supplier-2', 'Bargandy Quarry', 'Sales Head', 'sales@bargandy.com', '+91-9876543211'),
  ('supplier-3', 'Local Granite Quarry', 'Owner', 'owner@localquarry.com', '+91-9876543212')
ON CONFLICT (id) DO NOTHING;

-- Verify the suppliers were inserted
SELECT * FROM granite_suppliers;