# Multi-Cutter Reports Setup Instructions

## Problem
The multi-cutter analytics are showing all zeros because the `multi_cutter_reports` table doesn't exist in your database yet.

## Solution
Run the SQL migration to create the table.

### Option 1: Run via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Copy and paste the contents of `/migrations/create_multi_cutter_reports.sql`
4. Click **Run** to execute the SQL

### Option 2: Run the entire schema
If you're setting up a fresh database:
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Copy and paste the contents of `/supabase/schema.sql` (which now includes multi_cutter_reports)
4. Click **Run** to execute the SQL

### Verification
After running the SQL, you should be able to:
1. Add new multi-cutter production reports
2. See analytics update in real-time
3. View reports by machine in the tabbed interface

### Test Data (Optional)
To test the analytics, you can insert some sample data:

```sql
INSERT INTO multi_cutter_reports (date, machine, blocks, total_slabs, total_sqft) VALUES
  ('2025-01-15', 'Machine-1', '[{"block_name":"AVG-16B","material_type":"S/G","slabs":26,"sqft":721,"notes":""}]', 26, 721),
  ('2025-01-15', 'Machine-2', '[{"block_name":"AVG-17C","material_type":"B/P","slabs":31,"sqft":767,"notes":""}]', 31, 767),
  ('2025-01-15', 'Machine-3', '[{"block_name":"AVG-16A","material_type":"S/G","slabs":28,"sqft":777,"notes":""}]', 28, 777);
```

After inserting test data, refresh the multi-cutter page and you should see:
- Total Production: 85 Slabs
- Total Area: 2,265 Sq. Ft.
- Machine-specific totals in the analytics cards
