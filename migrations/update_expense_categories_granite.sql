-- Check current expense category usage
SELECT 
  ec.name as category_name,
  ec.color,
  COUNT(e.id) as times_used,
  COALESCE(SUM(e.amount), 0) as total_amount
FROM expense_categories ec
LEFT JOIN expenses e ON ec.id = e.category_id
GROUP BY ec.id, ec.name, ec.color
ORDER BY times_used DESC, ec.name;

-- Deactivate old/unused categories (don't delete to preserve history)
UPDATE expense_categories 
SET is_active = false
WHERE name IN (
  'Marketing & Sales',
  'Professional Services',
  'Insurance',
  'Office Expenses',
  'Employee Benefits',
  'Rent & Lease',
  'Staff Salaries',
  'Miscellaneous',
  'Water & Utilities',
  'Utilities',
  'Bike Petrol',
  'Employee Salary',
  'General',
  'Repair Expenses',
  'Lubricant Purchase',
  'Quarry Payment',
  'Tractor Diesel',
  'Contractor Payment',
  'EMI Payment',
  'Epoxy Purchase',
  'Line Polish Bits Purchase',
  'Nan Singh Payment',
  'Packing Material Purchase',
  'Electrical Purchase',
  'Slab System Payment',
  'Sree Bhagawati Payment',
  'Home Tax',
  'Loading Charges',
  'Segment Purchase',
  'Miscellaneous Expenses'
);

-- Update/Add granite factory specific categories (11 streamlined categories)
INSERT INTO expense_categories(name, description, color, is_active)
VALUES 
  -- Core Production
  ('Raw Materials', 'Granite blocks, quarry payments, stone purchases', '#EF4444', true),
  ('Machinery & Equipment', 'Machines, equipment purchases, slab system payments', '#3B82F6', true),
  ('Segment Purchases', 'Diamond segments for cutting machines', '#A855F7', true),
  ('Epoxy Purchases', 'Epoxy, resin, adhesives for stone bonding', '#06B6D4', true),
  ('Consumables', 'Polish bits, lubricants, packing materials, electrical items, blades', '#F59E0B', true),
  
  -- Operations
  ('Electricity', 'Factory power bills, generator diesel', '#FCD34D', true),
  ('Fuel & Diesel', 'Bike petrol, tractor diesel, factory vehicle fuel', '#10B981', true),
  ('Transportation', 'Freight charges, loading charges, delivery costs', '#14B8A6', true),
  
  -- Maintenance & Labor
  ('Maintenance & Repairs', 'Machine repairs, equipment servicing, spare parts', '#F97316', true),
  ('Labor & Wages', 'Employee salaries, contractor payments, daily wages, worker payments', '#EC4899', true),
  
  -- General
  ('Other Expenses', 'EMI payments, taxes, fees, office supplies, general miscellaneous', '#6B7280', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active;

-- Migrate existing expense data to new categories
-- Get new category IDs first
DO $$
DECLARE
  v_raw_materials_id UUID;
  v_machinery_id UUID;
  v_segments_id UUID;
  v_epoxy_id UUID;
  v_consumables_id UUID;
  v_electricity_id UUID;
  v_fuel_diesel_id UUID;
  v_transportation_id UUID;
  v_maintenance_id UUID;
  v_labor_wages_id UUID;
  v_other_id UUID;
BEGIN
  -- Get new category IDs
  SELECT id INTO v_raw_materials_id FROM expense_categories WHERE name = 'Raw Materials';
  SELECT id INTO v_machinery_id FROM expense_categories WHERE name = 'Machinery & Equipment';
  SELECT id INTO v_segments_id FROM expense_categories WHERE name = 'Segment Purchases';
  SELECT id INTO v_epoxy_id FROM expense_categories WHERE name = 'Epoxy Purchases';
  SELECT id INTO v_consumables_id FROM expense_categories WHERE name = 'Consumables';
  SELECT id INTO v_electricity_id FROM expense_categories WHERE name = 'Electricity';
  SELECT id INTO v_fuel_diesel_id FROM expense_categories WHERE name = 'Fuel & Diesel';
  SELECT id INTO v_transportation_id FROM expense_categories WHERE name = 'Transportation';
  SELECT id INTO v_maintenance_id FROM expense_categories WHERE name = 'Maintenance & Repairs';
  SELECT id INTO v_labor_wages_id FROM expense_categories WHERE name = 'Labor & Wages';
  SELECT id INTO v_other_id FROM expense_categories WHERE name = 'Other Expenses';

  -- Migrate Fuel & Diesel related
  UPDATE expenses SET category_id = v_fuel_diesel_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name IN ('Bike Petrol', 'Tractor Diesel')
  );

  -- Migrate Labor & Wages related
  UPDATE expenses SET category_id = v_labor_wages_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name IN ('Employee Salary', 'Contractor Payment', 'Nan Singh Payment', 'Sree Bhagawati Payment')
  );

  -- Migrate Raw Materials related
  UPDATE expenses SET category_id = v_raw_materials_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name = 'Quarry Payment'
  );

  -- Migrate Epoxy Purchases related
  UPDATE expenses SET category_id = v_epoxy_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name = 'Epoxy Purchase'
  );

  -- Migrate Consumables related
  UPDATE expenses SET category_id = v_consumables_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name IN ('Line Polish Bits Purchase', 'Lubricant Purchase', 'Packing Material Purchase', 'Electrical Purchase')
  );

  -- Migrate Maintenance & Repairs related
  UPDATE expenses SET category_id = v_maintenance_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name = 'Repair Expenses'
  );

  -- Migrate Machinery & Equipment related
  UPDATE expenses SET category_id = v_machinery_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name IN ('Slab System Payment', 'Segment Purchase')
  );

  -- Migrate Transportation related
  UPDATE expenses SET category_id = v_transportation_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name = 'Loading Charges'
  );

  -- Migrate Other Expenses related
  UPDATE expenses SET category_id = v_other_id
  WHERE category_id IN (
    SELECT id FROM expense_categories WHERE name IN ('General', 'Miscellaneous', 'EMI Payment', 'Office Expenses', 'Home Tax', 'Miscellaneous Expenses')
  );

  RAISE NOTICE 'Expense data migration completed successfully';
END $$;

-- Show final active categories
SELECT 
  name,
  description,
  color,
  is_active
FROM expense_categories
WHERE is_active = true
ORDER BY 
  CASE name
    WHEN 'Raw Materials' THEN 1
    WHEN 'Machinery & Equipment' THEN 2
    WHEN 'Segment Purchases' THEN 3
    WHEN 'Epoxy Purchases' THEN 4
    WHEN 'Consumables' THEN 5
    WHEN 'Electricity' THEN 6
    WHEN 'Fuel & Diesel' THEN 7
    WHEN 'Transportation' THEN 8
    WHEN 'Maintenance & Repairs' THEN 9
    WHEN 'Labor & Wages' THEN 10
    WHEN 'Other Expenses' THEN 11
    ELSE 99
  END;
