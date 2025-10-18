# Line Polish Reports - Analytics Examples

## JSONB Query Examples

The `activities` JSONB column allows powerful analytics! Here are examples:

### 1. Count Total S/G Polishing Done This Month

```sql
SELECT 
  SUM((activity->>'slabs')::integer) as total_slabs,
  SUM((activity->>'sqft')::numeric) as total_sqft
FROM line_polish_reports,
  jsonb_array_elements(activities) as activity
WHERE 
  date >= '2025-10-01' 
  AND date < '2025-11-01'
  AND activity->>'activity' = 'S/G Polishing';
```

**Result:** Total slabs and sqft for S/G Polishing in October 2025

---

### 2. Get All Activity Breakdown for a Month

```sql
SELECT 
  activity->>'activity' as activity_name,
  COUNT(*) as number_of_shifts,
  SUM((activity->>'slabs')::integer) as total_slabs,
  SUM((activity->>'sqft')::numeric) as total_sqft
FROM line_polish_reports,
  jsonb_array_elements(activities) as activity
WHERE 
  date >= '2025-10-01' 
  AND date < '2025-11-01'
GROUP BY activity->>'activity'
ORDER BY total_slabs DESC;
```

**Result:**
```
activity_name         | number_of_shifts | total_slabs | total_sqft
---------------------|------------------|-------------|------------
S/G Polishing        | 45               | 1234        | 56789.50
B/P Grinding         | 32               | 876         | 34567.25
S/G Laputra          | 28               | 654         | 23456.75
...
```

---

### 3. Find Which Days Had Most S/G Polish Grinding

```sql
SELECT 
  date,
  shift,
  SUM((activity->>'slabs')::integer) as slabs,
  SUM((activity->>'sqft')::numeric) as sqft
FROM line_polish_reports,
  jsonb_array_elements(activities) as activity
WHERE 
  activity->>'activity' = 'S/G Polish Grinding'
  AND date >= '2025-10-01'
GROUP BY date, shift
ORDER BY slabs DESC
LIMIT 10;
```

**Result:** Top 10 shifts with most S/G Polish Grinding work

---

### 4. Activity Mix Analysis (What Activities Are Done Together?)

```sql
SELECT 
  activity as activity_summary,
  COUNT(*) as occurrences,
  AVG(no_of_hours) as avg_hours,
  AVG(debit_amount) as avg_amount
FROM line_polish_reports
WHERE date >= '2025-10-01'
GROUP BY activity
ORDER BY occurrences DESC
LIMIT 20;
```

**Result:** Shows common activity combinations like "S/G Polishing, B/P Grinding"

---

### 5. Individual Activity Performance Over Time

```sql
SELECT 
  DATE_TRUNC('week', date) as week,
  activity->>'activity' as activity_name,
  COUNT(*) as times_performed,
  SUM((activity->>'slabs')::integer) as total_slabs,
  AVG((activity->>'slabs')::integer) as avg_slabs_per_shift
FROM line_polish_reports,
  jsonb_array_elements(activities) as activity
WHERE date >= '2025-09-01'
GROUP BY week, activity_name
ORDER BY week DESC, total_slabs DESC;
```

**Result:** Weekly trends for each activity type

---

### 6. Shift Efficiency by Activity Type

```sql
SELECT 
  activity->>'activity' as activity_name,
  AVG(no_of_hours) as avg_hours_per_shift,
  AVG((activity->>'slabs')::integer) as avg_slabs_per_activity,
  AVG((activity->>'sqft')::numeric) as avg_sqft_per_activity,
  (SUM((activity->>'slabs')::integer)::float / NULLIF(SUM(no_of_hours), 0)) as slabs_per_hour
FROM line_polish_reports,
  jsonb_array_elements(activities) as activity
WHERE date >= '2025-10-01'
GROUP BY activity_name
ORDER BY slabs_per_hour DESC;
```

**Result:** Efficiency metrics for each activity type

---

### 7. Multi-Activity Shifts (Shifts with 3+ Activities)

```sql
SELECT 
  date,
  shift,
  activity,
  jsonb_array_length(activities) as num_activities,
  no_of_hours,
  debit_amount,
  total_slabs,
  total_sqft
FROM line_polish_reports
WHERE 
  jsonb_array_length(activities) >= 3
  AND date >= '2025-10-01'
ORDER BY num_activities DESC, date DESC;
```

**Result:** Find complex shifts with multiple activities

---

### 8. Check if Specific Activity Exists in a Shift

```sql
SELECT *
FROM line_polish_reports
WHERE activities @> '[{"activity": "B/P Polishing"}]'
  AND date >= '2025-10-01';
```

**Result:** All shifts that included B/P Polishing (uses JSONB containment operator)

---

### 9. Activity Type Distribution (Percentage Breakdown)

```sql
WITH activity_counts AS (
  SELECT 
    activity->>'activity' as activity_name,
    COUNT(*) as count
  FROM line_polish_reports,
    jsonb_array_elements(activities) as activity
  WHERE date >= '2025-10-01'
  GROUP BY activity_name
)
SELECT 
  activity_name,
  count,
  ROUND(100.0 * count / SUM(count) OVER (), 2) as percentage
FROM activity_counts
ORDER BY count DESC;
```

**Result:**
```
activity_name         | count | percentage
---------------------|-------|------------
S/G Polishing        | 145   | 32.45%
B/P Grinding         | 98    | 21.96%
S/G Laputra          | 76    | 17.04%
...
```

---

### 10. Monthly Summary by Granite Type

```sql
-- Extract granite type from activity name (S/G, B/P, Burgandy)
SELECT 
  CASE 
    WHEN activity->>'activity' LIKE 'S/G%' THEN 'Sadarahalli Granite'
    WHEN activity->>'activity' LIKE 'B/P%' THEN 'Black Pearl'
    WHEN activity->>'activity' LIKE 'Burgandy%' THEN 'Burgandy'
    ELSE 'Other'
  END as granite_type,
  COUNT(DISTINCT r.id) as shifts_involved,
  SUM((activity->>'slabs')::integer) as total_slabs,
  SUM((activity->>'sqft')::numeric) as total_sqft
FROM line_polish_reports r,
  jsonb_array_elements(activities) as activity
WHERE date >= '2025-10-01' AND date < '2025-11-01'
GROUP BY granite_type
ORDER BY total_slabs DESC;
```

**Result:**
```
granite_type          | shifts_involved | total_slabs | total_sqft
---------------------|-----------------|-------------|-------------
Sadarahalli Granite  | 125             | 3456        | 123456.50
Black Pearl          | 98              | 2345        | 89012.75
Burgandy             | 45              | 876         | 34567.25
```

---

## How to Use These Queries

### In Supabase Dashboard:
1. Go to SQL Editor
2. Paste any query above
3. Modify date ranges as needed
4. Click "Run"

### In Your Application:
You can create API endpoints to expose these analytics. For example:

**`/app/api/line-polish-reports/analytics-by-activity/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || '2025-10-01';
  const to = url.searchParams.get("to") || '2025-10-31';
  
  const { data, error } = await supabaseAdmin.rpc('get_activity_analytics', {
    start_date: from,
    end_date: to
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

Then create a PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION get_activity_analytics(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  activity_name TEXT,
  shifts_count BIGINT,
  total_slabs BIGINT,
  total_sqft NUMERIC,
  avg_slabs_per_shift NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    activity->>'activity' as activity_name,
    COUNT(DISTINCT r.id) as shifts_count,
    SUM((activity->>'slabs')::integer) as total_slabs,
    SUM((activity->>'sqft')::numeric) as total_sqft,
    AVG((activity->>'slabs')::integer) as avg_slabs_per_shift
  FROM line_polish_reports r,
    jsonb_array_elements(r.activities) as activity
  WHERE 
    r.date >= start_date 
    AND r.date <= end_date
  GROUP BY activity->>'activity'
  ORDER BY total_slabs DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## Benefits of JSONB Storage for Analytics

✅ **Flexible Queries**: Query individual activities within combined shifts
✅ **Detailed Breakdowns**: Get per-activity metrics even though payment is combined
✅ **Trend Analysis**: Track specific activity types over time
✅ **Performance**: GIN index on activities makes these queries fast
✅ **Historical Data**: Can analyze activity patterns and efficiency
✅ **Business Insights**: Understand which activities are most common, profitable, etc.

---

## Example: Creating an Analytics Dashboard Page

You could create `/app/production/line-polish/analytics/page.tsx` that shows:

1. **Activity Type Pie Chart** - Distribution of all activities
2. **Monthly Trends** - Line chart showing each activity over time
3. **Top Performers** - Which activities produced most slabs/sqft
4. **Efficiency Metrics** - Slabs per hour by activity type
5. **Granite Type Breakdown** - S/G vs B/P vs Burgandy statistics

The JSONB structure gives you all the data you need for deep analytics! 🚀
