# Multi-Cutter Analytics Troubleshooting Guide

## Current Status
I've added extensive debugging and created a debug page to help identify the exact issue.

## What I've Done

### 1. Enhanced Logging
- ✅ Added detailed console logs in the frontend (page.tsx)
- ✅ Added server-side logs in the API route
- ✅ Logs show every step: component mount → API call → data received → summary calculated

### 2. Created Debug Page
- ✅ Visit: `http://localhost:3000/production/multi-cutter-debug`
- This page will show you:
  - API response status
  - Exact data structure received
  - Number of reports
  - Calculated summaries
  - All report details

### 3. Database Diagnostic
- ✅ Created `check_multi_cutter_data.sql` file
- Run this in Supabase SQL Editor to see database content

## How to Diagnose the Issue

### Step 1: Check if Table Exists
Run in Supabase SQL Editor:
```sql
SELECT * FROM multi_cutter_reports LIMIT 10;
```

**If you get "relation does not exist" error:**
- The table wasn't created
- Run `/migrations/create_multi_cutter_reports.sql` in Supabase SQL Editor

**If you get "0 rows":**
- Table exists but is empty
- You need to add data first (go to Step 3)

### Step 2: Check the Debug Page
1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000/production/multi-cutter-debug`
3. Check what it shows:
   - **If it shows data**: The API works, issue is in main page
   - **If it shows 0 reports**: Database is empty
   - **If it shows error**: Check the error message

### Step 3: Add Test Data
If database is empty, run this SQL:
```sql
-- Delete any existing data for today
DELETE FROM multi_cutter_reports WHERE date = CURRENT_DATE;

-- Insert test data for today
INSERT INTO multi_cutter_reports (date, machine, blocks, total_slabs, total_sqft) 
VALUES
  (
    CURRENT_DATE,
    'Machine-1',
    '[
      {"block_name":"AVG-16B","material_type":"S/G","slabs":26,"sqft":721,"notes":"Test block 1"},
      {"block_name":"AVG-17A","material_type":"B/P","slabs":30,"sqft":850,"notes":"Test block 2"}
    ]'::jsonb,
    56,
    1571
  ),
  (
    CURRENT_DATE,
    'Machine-2',
    '[
      {"block_name":"AVG-18C","material_type":"S/G","slabs":31,"sqft":767,"notes":""}
    ]'::jsonb,
    31,
    767
  ),
  (
    CURRENT_DATE,
    'Machine-3',
    '[
      {"block_name":"AVG-19A","material_type":"Burgandy","slabs":28,"sqft":777,"notes":""}
    ]'::jsonb,
    28,
    777
  );

-- Verify the data
SELECT 
  date,
  machine,
  total_slabs,
  total_sqft,
  jsonb_array_length(blocks) as block_count
FROM multi_cutter_reports
ORDER BY date DESC, machine;
```

### Step 4: Check Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Refresh the multi-cutter page
4. Look for logs starting with:
   - `MultiCutterPage component mounted`
   - `useEffect triggered - loading reports`
   - `✅ API Response`
   - `✅ Summary calculated`

### Step 5: Check Server Logs
Look at your terminal where `npm run dev` is running.
You should see:
```
🔍 GET /api/multi-cutter-reports called with params: ...
✅ Supabase query successful - Retrieved X reports
```

## Expected Results

### With Test Data Above:
- **Total Production**: 115 Slabs
- **Total Area**: 3,115 Sq. Ft.
- **Today's Production**: 3,115 Sq. Ft. (since we used CURRENT_DATE)
- **Machine-1 Production**: 1,571 Sq. Ft.
- **Machine-2 Production**: 767 Sq. Ft.
- **Machine-3 Production**: 777 Sq. Ft.

## Common Issues & Solutions

### Issue 1: Analytics Still Show 0
**Cause**: Date filter is active
**Solution**: Clear the date filters on the multi-cutter page

### Issue 2: "Today's Production" shows 0
**Cause**: No data for today's date
**Solution**: Either:
- Add data for today from the form
- Use test data with CURRENT_DATE (see Step 3)
- Clear date filters to see all data

### Issue 3: No console logs at all
**Cause**: Page not loading/JavaScript error
**Solution**: Check browser console for errors

### Issue 4: API returns empty array
**Cause**: Database is empty or filters exclude all data
**Solution**: 
- Check database has data
- Clear date filters
- Check Supabase connection

## Files Modified

1. `/app/production/multi-cutter/page.tsx` - Enhanced logging
2. `/app/api/multi-cutter-reports/route.ts` - Enhanced logging
3. `/app/production/multi-cutter-debug/page.tsx` - NEW debug page
4. `/check_multi_cutter_data.sql` - NEW diagnostic queries
5. `/supabase/schema.sql` - Added multi_cutter_reports table

## Quick Test Script

Run this in order:

1. **Check table exists**:
   ```sql
   SELECT COUNT(*) FROM multi_cutter_reports;
   ```

2. **Add test data** (use SQL from Step 3 above)

3. **Visit debug page**: `http://localhost:3000/production/multi-cutter-debug`

4. **Visit main page**: `http://localhost:3000/production/multi-cutter`

5. **Check console**: Should see calculated totals in logs

## If Nothing Works

If after all this the analytics still don't work:
1. Share the console logs (browser F12 console)
2. Share the server logs (terminal output)
3. Share screenshot of debug page
4. Share result of: `SELECT * FROM multi_cutter_reports;`

This will help me identify the exact issue.
