-- Migration: Create sales tracking tables
-- Sales records with line items that auto-create consignments

-- Create material_types enum or table (using table for flexibility)
CREATE TABLE IF NOT EXISTS material_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table (header)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  sale_date DATE NOT NULL,
  
  -- Summary totals (calculated from line items)
  total_slabs INTEGER DEFAULT 0,
  total_sqft NUMERIC(15, 2) DEFAULT 0,
  subtotal_amount NUMERIC(15, 2) DEFAULT 0,
  
  -- Additional charges
  tax_amount NUMERIC(15, 2) DEFAULT 0,
  mining_amount NUMERIC(15, 2) DEFAULT 0,
  loading_amount NUMERIC(15, 2) DEFAULT 0,
  
  -- Gross total
  gross_total NUMERIC(15, 2) DEFAULT 0,
  
  -- Payment split
  rtgs_expected NUMERIC(15, 2) DEFAULT 0,
  cash_expected NUMERIC(15, 2) DEFAULT 0,
  
  -- Metadata
  remarks TEXT,
  consignment_id UUID REFERENCES consignments(id), -- Link to auto-created consignment
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table (line items)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  material_type_id UUID REFERENCES material_types(id),
  material_name TEXT NOT NULL, -- Store name even if type is deleted
  slabs_count INTEGER NOT NULL DEFAULT 0,
  square_feet NUMERIC(15, 2) NOT NULL DEFAULT 0,
  rate_per_sqft NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- slabs_count * square_feet * rate_per_sqft or square_feet * rate_per_sqft
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_consignment_id ON sales(consignment_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_material_type_id ON sale_items(material_type_id);

-- Add comments for documentation
COMMENT ON TABLE sales IS 'Sales records that automatically create consignments for customers';
COMMENT ON TABLE sale_items IS 'Line items for each sale (material type, quantity, rate, amount)';
COMMENT ON TABLE material_types IS 'Master data for material types (granite types, marble, etc.)';

COMMENT ON COLUMN sales.sale_number IS 'Unique sale reference number (e.g., SALE-2025-001)';
COMMENT ON COLUMN sales.subtotal_amount IS 'Sum of all line item totals';
COMMENT ON COLUMN sales.gross_total IS 'Subtotal + tax + mining + loading';
COMMENT ON COLUMN sales.consignment_id IS 'Auto-created consignment record for this sale';
COMMENT ON COLUMN sale_items.total_amount IS 'square_feet * rate_per_sqft';

-- Insert default material types
INSERT INTO material_types(name, description) VALUES
  ('Granite Slab', 'Standard granite slabs'),
  ('Marble Slab', 'Standard marble slabs'),
  ('Quartz', 'Engineered quartz slabs'),
  ('Tiles', 'Granite or marble tiles'),
  ('Other', 'Other materials')
ON CONFLICT (name) DO NOTHING;

-- Function to generate next sale number
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TEXT AS $$
DECLARE
  year_suffix TEXT;
  next_num INTEGER;
  sale_num TEXT;
BEGIN
  -- Get current year suffix (last 2 digits)
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get the highest sale number for current year
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(sale_number FROM 'SALE-' || year_suffix || '-(\d+)')
        AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_num
  FROM sales
  WHERE sale_number LIKE 'SALE-' || year_suffix || '-%';
  
  -- Format as SALE-YY-NNN
  sale_num := 'SALE-' || year_suffix || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN sale_num;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update sales summary when items change
CREATE OR REPLACE FUNCTION update_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate summary for the affected sale
  UPDATE sales
  SET 
    total_slabs = (
      SELECT COALESCE(SUM(slabs_count), 0)
      FROM sale_items
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    ),
    total_sqft = (
      SELECT COALESCE(SUM(square_feet), 0)
      FROM sale_items
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    ),
    subtotal_amount = (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM sale_items
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  -- Recalculate gross total
  UPDATE sales
  SET 
    gross_total = subtotal_amount + tax_amount + mining_amount + loading_amount,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating sales summary
DROP TRIGGER IF EXISTS trigger_update_sales_summary ON sale_items;
CREATE TRIGGER trigger_update_sales_summary
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_summary();

-- Function to update gross total when charges change
CREATE OR REPLACE FUNCTION update_sales_gross_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.gross_total := NEW.subtotal_amount + NEW.tax_amount + NEW.mining_amount + NEW.loading_amount;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating gross total
DROP TRIGGER IF EXISTS trigger_update_sales_gross_total ON sales;
CREATE TRIGGER trigger_update_sales_gross_total
  BEFORE UPDATE ON sales
  FOR EACH ROW
  WHEN (
    OLD.subtotal_amount IS DISTINCT FROM NEW.subtotal_amount OR
    OLD.tax_amount IS DISTINCT FROM NEW.tax_amount OR
    OLD.mining_amount IS DISTINCT FROM NEW.mining_amount OR
    OLD.loading_amount IS DISTINCT FROM NEW.loading_amount
  )
  EXECUTE FUNCTION update_sales_gross_total();
