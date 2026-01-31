-- Add updated_at column to vendors table if it doesn't exist
-- This fixes the trigger error: record "new" has no field "updated_at"

DO $$ 
BEGIN
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='vendors' 
    AND column_name='updated_at'
  ) THEN
    ALTER TABLE vendors ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Update existing records to have current timestamp
    UPDATE vendors SET updated_at = created_at WHERE updated_at IS NULL;
    
    RAISE NOTICE 'Added updated_at column to vendors table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in vendors table';
  END IF;

  -- Add updated_at column to vendor_transactions if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='vendor_transactions' 
    AND column_name='updated_at'
  ) THEN
    ALTER TABLE vendor_transactions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Update existing records to have current timestamp
    UPDATE vendor_transactions SET updated_at = created_at WHERE updated_at IS NULL;
    
    RAISE NOTICE 'Added updated_at column to vendor_transactions table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in vendor_transactions table';
  END IF;
END $$;

-- Recreate the trigger function to ensure it's correct
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate triggers
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

-- Verify the columns exist
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('vendors', 'vendor_transactions') 
AND column_name = 'updated_at';
