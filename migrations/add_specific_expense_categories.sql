-- ============================================================================
-- ADD SPECIFIC EXPENSE CATEGORIES
-- ============================================================================
-- Adds specific expense categories for granite business operations:
-- - Repair expenses
-- - Segment purchase expenses
-- - Line polish bits purchase expense
-- - Lubricant purchase expenses
-- - Epoxy purchase expenses
-- - Miscellaneous expenses
-- - Bike petrol expenses
-- ============================================================================

-- Insert new expense categories (idempotent - won't create duplicates)
INSERT INTO expense_categories(name, description, color)
SELECT x.name, x.description, x.color FROM (VALUES 
  ('Repair Expenses', 'Machinery and equipment repair costs', '#F97316'),
  ('Segment Purchase', 'Diamond segments and cutting segments purchase', '#3B82F6'),
  ('Line Polish Bits Purchase', 'Line polishing bits and accessories', '#8B5CF6'),
  ('Lubricant Purchase', 'Oils, grease, and lubricants for machinery', '#F59E0B'),
  ('Epoxy Purchase', 'Epoxy resins and adhesives for stone processing', '#EC4899'),
  ('Miscellaneous Expenses', 'Other operational expenses', '#64748B'),
  ('Bike Petrol', 'Motorcycle fuel expenses for business use', '#10B981')
) AS x(name, description, color)
WHERE NOT EXISTS (SELECT 1 FROM expense_categories ec WHERE ec.name = x.name);

-- Verify the categories were added
SELECT 
  name,
  description,
  color,
  is_active,
  created_at
FROM expense_categories
WHERE name IN (
  'Repair Expenses',
  'Segment Purchase',
  'Line Polish Bits Purchase',
  'Lubricant Purchase',
  'Epoxy Purchase',
  'Miscellaneous Expenses',
  'Bike Petrol'
)
ORDER BY name;

-- Add comment
COMMENT ON TABLE expense_categories IS 
'Expense categories including specific granite business operational categories';
