-- Re-categorize expenses currently under "Other Expenses" to appropriate categories
-- Based on date and amount matching

-- First, let's store category IDs in variables for easier reference
DO $$
DECLARE
  staff_expenses_id UUID;
  office_expenses_id UUID;
  fuel_diesel_id UUID;
  slab_system_id UUID;
  bank_emi_id UUID;
  labor_wages_id UUID;
  other_expenses_id UUID;
BEGIN
  -- Get category UUIDs
  SELECT id INTO staff_expenses_id FROM expense_categories WHERE name = 'Staff Expenses';
  SELECT id INTO office_expenses_id FROM expense_categories WHERE name = 'Office Expenses';
  SELECT id INTO fuel_diesel_id FROM expense_categories WHERE name = 'Fuel & Diesel';
  SELECT id INTO slab_system_id FROM expense_categories WHERE name = 'Slab System Payment';
  SELECT id INTO bank_emi_id FROM expense_categories WHERE name = 'Bank EMI';
  SELECT id INTO labor_wages_id FROM expense_categories WHERE name = 'Labor & Wages';
  SELECT id INTO other_expenses_id FROM expense_categories WHERE name = 'Other Expenses';

  -- 1. Move to Staff Expenses (food, tea, sweets, medicine)
  UPDATE expenses SET category_id = staff_expenses_id
  WHERE date = '2026-01-01' AND total_amount = 5250 AND category_id = other_expenses_id;
  
  UPDATE expenses SET category_id = staff_expenses_id
  WHERE date = '2026-01-02' AND total_amount = 120 AND category_id = other_expenses_id;
  
  UPDATE expenses SET category_id = staff_expenses_id
  WHERE date = '2026-01-07' AND total_amount = 200 AND category_id = other_expenses_id;
  
  UPDATE expenses SET category_id = staff_expenses_id
  WHERE date = '2026-01-15' AND total_amount = 1200 AND category_id = other_expenses_id
    AND description ILIKE '%sweets%';
  
  UPDATE expenses SET category_id = staff_expenses_id
  WHERE date = '2026-01-17' AND total_amount = 1000 AND category_id = other_expenses_id
    AND description ILIKE '%food%';
  
  UPDATE expenses SET category_id = staff_expenses_id
  WHERE date = '2026-01-09' AND total_amount = 900 AND category_id = other_expenses_id
    AND description ILIKE '%medicine%';

  -- 2. Move to Office Expenses (batteries, printer)
  UPDATE expenses SET category_id = office_expenses_id
  WHERE date = '2026-01-06' AND total_amount = 200 AND category_id = other_expenses_id
    AND description ILIKE '%battery%';
  
  UPDATE expenses SET category_id = office_expenses_id
  WHERE date = '2026-01-15' AND total_amount = 1100 AND category_id = other_expenses_id
    AND description ILIKE '%batter%';
  
  UPDATE expenses SET category_id = office_expenses_id
  WHERE date = '2026-01-09' AND total_amount = 900 AND category_id = other_expenses_id
    AND description ILIKE '%printer%';

  -- 3. Move to Fuel & Diesel
  UPDATE expenses SET category_id = fuel_diesel_id
  WHERE date = '2026-01-09' AND total_amount = 900 AND category_id = other_expenses_id
    AND description ILIKE '%petrol%';

  -- 4. Move to Slab System Payment
  UPDATE expenses SET category_id = slab_system_id
  WHERE date = '2026-01-06' AND total_amount = 201880 AND category_id = other_expenses_id;

  -- 5. Move to Bank EMI
  UPDATE expenses SET category_id = bank_emi_id
  WHERE date = '2026-01-06' AND total_amount = 740558 AND category_id = other_expenses_id;

  -- 6. Move to Labor & Wages (advance payment)
  UPDATE expenses SET category_id = labor_wages_id
  WHERE date = '2026-01-15' AND total_amount = 1000 AND category_id = other_expenses_id
    AND description ILIKE '%advance%';

  -- Cash withdrawal (₹2,50,000) - NO CHANGE as per user request

  RAISE NOTICE 'Re-categorization completed successfully!';
END $$;

-- Verify the changes
SELECT 
  e.date,
  e.description,
  e.total_amount,
  ec.name as category
FROM expenses e
JOIN expense_categories ec ON ec.id = e.category_id
WHERE e.date BETWEEN '2026-01-01' AND '2026-01-17'
  AND ec.name IN ('Staff Expenses', 'Office Expenses', 'Fuel & Diesel', 
                  'Slab System Payment', 'Bank EMI', 'Labor & Wages')
ORDER BY e.date, e.total_amount;
