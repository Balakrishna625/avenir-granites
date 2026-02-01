-- Fix for the ambiguous column reference error
-- Run this to update the function

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
