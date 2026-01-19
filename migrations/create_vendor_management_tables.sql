-- Create Vendor Management System Tables
-- This creates a completely separate system for tracking vendor balances and transactions

-- 1. Check and update vendors table schema
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add notes column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='notes') THEN
    ALTER TABLE vendors ADD COLUMN notes TEXT;
  END IF;
  
  -- Add vendor_code column if it doesn't exist (used by existing code)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='vendor_code') THEN
    ALTER TABLE vendors ADD COLUMN vendor_code VARCHAR(50);
  END IF;
  
  -- Add gst_number column if it doesn't exist (used by existing code)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='gst_number') THEN
    ALTER TABLE vendors ADD COLUMN gst_number VARCHAR(50);
  END IF;
  
  -- Add payment_terms column if it doesn't exist (used by existing code)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='payment_terms') THEN
    ALTER TABLE vendors ADD COLUMN payment_terms TEXT;
  END IF;
END $$;

-- 2. Create vendor_transactions table
CREATE TABLE IF NOT EXISTS vendor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'payment')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_vendor_id ON vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_date ON vendor_transactions(date);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_type ON vendor_transactions(type);

-- 4. Add UNIQUE constraint to vendors.name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vendors_name_key' AND conrelid = 'vendors'::regclass
  ) THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_name_key UNIQUE (name);
  END IF;
END $$;

-- 5. Insert initial vendors
INSERT INTO vendors (name, notes) VALUES
  ('Cherukuri Abrasives', 'Abrasives and grinding tools supplier'),
  ('PSR', 'General supplier'),
  ('Mahalakshmi', 'Supplier'),
  ('Wood Supplier', 'Wood and timber supplier'),
  ('Vinayaka', 'General supplier')
ON CONFLICT (name) DO NOTHING;

-- 6. Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_transactions_updated_at ON vendor_transactions;
CREATE TRIGGER update_vendor_transactions_updated_at
  BEFORE UPDATE ON vendor_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Verify tables created
SELECT 
  'vendors' as table_name, 
  COUNT(*) as record_count 
FROM vendors
UNION ALL
SELECT 
  'vendor_transactions' as table_name, 
  COUNT(*) as record_count 
FROM vendor_transactions;
