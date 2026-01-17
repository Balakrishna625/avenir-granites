-- Enable and add requested expense categories
-- Run this script to enable: EMI Payments, Staff Expenses, Office Expenses, Slab System

-- 1. Enable Office Expenses (already exists, just inactive)
UPDATE expense_categories
SET is_active = true
WHERE name = 'Office Expenses';

-- 2. Enable/Rename EMI Payment to be consistent
UPDATE expense_categories
SET is_active = true
WHERE name = 'EMI Payment';

-- Also enable Bank EMI if it exists
UPDATE expense_categories
SET is_active = true
WHERE name = 'Bank EMI';

-- 3. Enable Slab System Payment
UPDATE expense_categories
SET is_active = true
WHERE name = 'Slab System Payment';

-- 4. Add Staff Expenses (new category)
INSERT INTO expense_categories (name, description, color, is_active)
VALUES ('Staff Expenses', 'Employee salaries, benefits, staff welfare', '#EC4899', true)
ON CONFLICT (name) DO UPDATE
SET is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    color = EXCLUDED.color;

-- 5. Verify active categories
SELECT 
  name,
  description,
  is_active,
  (SELECT COUNT(*) FROM expenses e WHERE e.category_id = expense_categories.id) as usage_count
FROM expense_categories
WHERE is_active = true
ORDER BY name;
