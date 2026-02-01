-- Migration: Create unpolish purchases tracking tables
-- Track unpolished material purchases from factories

-- Create factories table
CREATE TABLE IF NOT EXISTS factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unpolish material types table
CREATE TABLE IF NOT EXISTS unpolish_material_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unpolish purchases table
CREATE TABLE IF NOT EXISTS unpolish_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT UNIQUE NOT NULL,
  purchase_date DATE NOT NULL,
  factory_id UUID NOT NULL REFERENCES factories(id),
  factory_name TEXT NOT NULL, -- Store name even if factory is deleted
  material_type_id UUID NOT NULL REFERENCES unpolish_material_types(id),
  material_name TEXT NOT NULL, -- Store name even if type is deleted
  slabs_count INTEGER NOT NULL DEFAULT 0,
  sft NUMERIC(15, 3) NOT NULL DEFAULT 0, -- Square feet with 3 decimal precision
  rate_per_sft NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- sft * rate_per_sft
  remarks TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unpolish_purchases_factory_id ON unpolish_purchases(factory_id);
CREATE INDEX IF NOT EXISTS idx_unpolish_purchases_material_type_id ON unpolish_purchases(material_type_id);
CREATE INDEX IF NOT EXISTS idx_unpolish_purchases_purchase_date ON unpolish_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_unpolish_purchases_purchase_number ON unpolish_purchases(purchase_number);

-- Add comments for documentation
COMMENT ON TABLE factories IS 'Master data for factories that supply unpolished materials';
COMMENT ON TABLE unpolish_material_types IS 'Master data for unpolished material types';
COMMENT ON TABLE unpolish_purchases IS 'Records of unpolished material purchases from factories';

COMMENT ON COLUMN unpolish_purchases.purchase_number IS 'Unique purchase reference number (e.g., UNP-2026-001)';
COMMENT ON COLUMN unpolish_purchases.sft IS 'Square feet with up to 3 decimal places precision';
COMMENT ON COLUMN unpolish_purchases.total_amount IS 'Calculated as sft * rate_per_sft';

-- Insert default unpolish material types
INSERT INTO unpolish_material_types(name, description) VALUES
  ('B/P unpolish', 'Black Pearl Unpolished'),
  ('S/G unpolish', 'Steel Grey Unpolished')
ON CONFLICT (name) DO NOTHING;

-- Insert some sample factories (optional, can be removed if not needed)
INSERT INTO factories(name, is_active) VALUES
  ('Factory 1', true),
  ('Factory 2', true)
ON CONFLICT (name) DO NOTHING;

-- Function to generate next purchase number
CREATE OR REPLACE FUNCTION generate_unpolish_purchase_number()
RETURNS TEXT AS $$
DECLARE
  year_suffix TEXT;
  next_num INTEGER;
  purchase_number TEXT;
BEGIN
  -- Get last 2 digits of current year
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN unpolish_purchases.purchase_number ~ '^UNP-[0-9]{2}-[0-9]+$' 
      THEN CAST(SPLIT_PART(unpolish_purchases.purchase_number, '-', 3) AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1
  INTO next_num
  FROM unpolish_purchases
  WHERE unpolish_purchases.purchase_number LIKE 'UNP-' || year_suffix || '-%';
  
  -- Format: UNP-YY-NNN
  purchase_number := 'UNP-' || year_suffix || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN purchase_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate purchase number
CREATE OR REPLACE FUNCTION set_unpolish_purchase_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.purchase_number IS NULL OR NEW.purchase_number = '' THEN
    NEW.purchase_number := generate_unpolish_purchase_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate purchase number on insert
DROP TRIGGER IF EXISTS trigger_set_unpolish_purchase_number ON unpolish_purchases;
CREATE TRIGGER trigger_set_unpolish_purchase_number
  BEFORE INSERT ON unpolish_purchases
  FOR EACH ROW
  EXECUTE FUNCTION set_unpolish_purchase_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_factories_updated_at ON factories;
CREATE TRIGGER update_factories_updated_at
  BEFORE UPDATE ON factories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_unpolish_material_types_updated_at ON unpolish_material_types;
CREATE TRIGGER update_unpolish_material_types_updated_at
  BEFORE UPDATE ON unpolish_material_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_unpolish_purchases_updated_at ON unpolish_purchases;
CREATE TRIGGER update_unpolish_purchases_updated_at
  BEFORE UPDATE ON unpolish_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust based on your auth setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON factories TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON unpolish_material_types TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON unpolish_purchases TO authenticated;
