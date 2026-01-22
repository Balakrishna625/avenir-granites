-- Check if entry_type column exists and view sample data
SELECT 
  id,
  date,
  total,
  entry_type,
  remarks
FROM consignments 
ORDER BY date DESC 
LIMIT 10;
