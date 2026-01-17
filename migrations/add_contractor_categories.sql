-- Enable existing "Contractor Payment" and add "Polish Contractor Payments"

-- 1. Enable existing "Contractor Payment" category
UPDATE expense_categories
SET is_active = true
WHERE name = 'Contractor Payment';

-- 2. Add new "Polish Contractor Payments" category
INSERT INTO expense_categories (name, description, color, is_active)
VALUES ('Polish Contractor Payments', 'Payments to polish contractors and polishing work', '#8B5CF6', true)
ON CONFLICT (name) DO UPDATE
SET is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    color = EXCLUDED.color;

-- 3. Verify active contractor-related categories
SELECT 
  name,
  description,
  color,
  is_active,
  (SELECT COUNT(*) FROM expenses e WHERE e.category_id = expense_categories.id) as usage_count
FROM expense_categories
WHERE name ILIKE '%contractor%' OR name ILIKE '%polish%'
ORDER BY name;
