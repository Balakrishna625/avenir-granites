-- Diagnostic SQL to check multi_cutter_reports data
-- Run this in your Supabase SQL Editor to see what data exists

-- Check if table exists and show structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'multi_cutter_reports'
ORDER BY ordinal_position;

-- Count total records
SELECT COUNT(*) as total_records FROM multi_cutter_reports;

-- Show all data with details
SELECT 
  id,
  date,
  machine,
  blocks,
  total_slabs,
  total_sqft,
  created_at
FROM multi_cutter_reports
ORDER BY date DESC, machine;

-- Show summary by machine
SELECT 
  machine,
  COUNT(*) as report_count,
  SUM(total_slabs) as total_slabs_sum,
  SUM(total_sqft) as total_sqft_sum
FROM multi_cutter_reports
GROUP BY machine
ORDER BY machine;

-- Show daily totals
SELECT 
  date,
  COUNT(*) as machines_reporting,
  SUM(total_slabs) as daily_slabs,
  SUM(total_sqft) as daily_sqft
FROM multi_cutter_reports
GROUP BY date
ORDER BY date DESC;
