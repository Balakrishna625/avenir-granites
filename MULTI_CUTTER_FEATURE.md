# Multi-Cutter Production Tracking System

## Overview
Complete production tracking system for 3 multi-cutter machines that cut granite blocks into slabs. Tracks daily production with detailed block-level data including block names, material types, slabs, and square footage.

---

## ✅ Implementation Complete

### 1. Database Schema
**File**: `/migrations/create_multi_cutter_reports.sql`

**Table**: `multi_cutter_reports`
- `id`: UUID primary key
- `date`: Date of production
- `machine`: Machine identifier (Machine-1, Machine-2, Machine-3)
- `blocks`: JSONB array storing multiple blocks per machine
  ```json
  [
    {"block_name": "AVG-16B", "material_type": "S/G", "slabs": 26, "sqft": 721},
    {"block_name": "AVG-01A", "material_type": "S/G", "slabs": 45, "sqft": 1282}
  ]
  ```
- `total_slabs`: Aggregated total slabs for the machine on that date
- `total_sqft`: Aggregated total square footage
- `created_at`, `updated_at`: Timestamps

**Key Features**:
- UNIQUE constraint on (date, machine) - one entry per machine per day
- GIN index on blocks JSONB for fast queries
- Automatic timestamp updates via trigger

### 2. API Endpoints

#### `/api/multi-cutter-reports` (GET, POST, PUT, DELETE)
**Purpose**: CRUD operations for multi-cutter reports

**GET**: List reports with optional filters
- Query params: `from`, `to`, `machine`
- Returns: Array of reports ordered by date DESC

**POST**: Create new report
- Body: `{ date, machine, blocks, total_slabs, total_sqft }`
- Auto-calculates totals if not provided
- Validates machine name

**PUT**: Update existing report
- Body: `{ id, date, machine, blocks, total_slabs, total_sqft }`
- Recalculates totals when blocks are updated

**DELETE**: Remove report
- Query param: `id`

#### `/api/multi-cutter-reports/analytics` (GET)
**Purpose**: Comprehensive analytics and business intelligence

**Returns**:
- `summary`: Overall statistics (total production, days, machines)
- `machine_breakdown`: Performance by machine (Machine-1, 2, 3)
- `daily_trends`: Last 30 days of production data
- `material_breakdown`: Analysis by material type (S/G, B/P, Burgandy)
- `top_blocks`: Top 10 highest-producing blocks

**Query Params**:
- `from`, `to`: Date range
- `month`, `year`: Specific month filtering

### 3. Data Entry Page

**File**: `/app/production/multi-cutter/page.tsx`

**Features**:
- ✅ **Multi-Machine Form**: Add data for all 3 machines simultaneously
- ✅ **Dynamic Block Rows**: Add/remove multiple blocks per machine
- ✅ **Real-time Totals**: Calculates machine totals and grand totals live
- ✅ **Color-Coded Machines**: Blue (Machine-1), Green (Machine-2), Purple (Machine-3)
- ✅ **Summary Tiles**: 7 KPI tiles showing production metrics
- ✅ **Date Filtering**: Filter records by date range
- ✅ **Edit/Delete**: Inline actions for each report
- ✅ **Grouped Display**: Records organized by date with all 3 machines

**Summary Tiles**:
1. Total Production (Slabs Cut)
2. Total Area (Sq. Ft. Produced)
3. Today's Production
4. Active Machines (3)
5. Machine-1 Production (Blue)
6. Machine-2 Production (Green)
7. Machine-3 Production (Purple)

**Form Structure**:
```
Date: [Date Picker]

┌─ Machine-1 (Blue Border) ───────────────┐
│ Block Name | Material | Slabs | Sq.Ft. │
│ AVG-16B    | S/G      | 26    | 721    │
│ AVG-01A    | S/G      | 45    | 1282   │
│ [+ Add Block]                           │
│ Total: 71 Slabs | 2,003 Sq. Ft.        │
└─────────────────────────────────────────┘

┌─ Machine-2 (Green Border) ──────────────┐
│ Block Name | Material | Slabs | Sq.Ft. │
│ AVG-17C    | S/G      | 31    | 767    │
│ AVG-6A     | S/G      | 8     | 228    │
│ [+ Add Block]                           │
│ Total: 39 Slabs | 995 Sq. Ft.          │
└─────────────────────────────────────────┘

┌─ Machine-3 (Purple Border) ─────────────┐
│ Block Name | Material | Slabs | Sq.Ft. │
│ AVG-16A    | S/G      | 28    | 777    │
│ AVG-01B    | S/G      | 44    | 1287   │
│ [+ Add Block]                           │
│ Total: 72 Slabs | 2,064 Sq. Ft.        │
└─────────────────────────────────────────┘

Grand Total: 182 Slabs | 5,062 Sq. Ft.

[Save Report] [Cancel]
```

### 4. Analytics Page

**File**: `/app/production/multi-cutter-analytics/page.tsx`

**Business Metrics** (Similar to Line Polish Analytics):

#### Row 1: Key Production Metrics (4 tiles)
1. **Total Production**: Total slabs cut
2. **Total Area**: Total sq. ft. produced
3. **Working Days**: Number of production days
4. **Active Machines**: Count of machines (3)

#### Row 2: Efficiency Metrics (4 tiles - colored backgrounds)
1. **Daily Avg Output** (Green): Sq. ft. per day
2. **Slabs per Day** (Blue): Daily average slabs
3. **Machine Efficiency** (Purple): Sq. ft. per machine per day
4. **Utilization** (Amber): % of target (2000 sqft/day per machine)

#### Performance Trends (2 cards)
- **Slabs Trend**: Last 7 days vs previous 7 days with % change
- **SqFt Trend**: Last 7 days vs previous 7 days with % change
- Green ↑ for improvement, Red ↓ for decline

#### Best & Worst Days (2 cards)
- **Best Performance Day** (Green): Highest production day with details
- **Needs Improvement Day** (Red): Lowest production day with details

#### Daily Performance Chart
- Horizontal bar chart showing last 15 days
- Gradient purple bars
- Shows slabs, sqft, and active machines per day

#### Machine Performance Comparison (3 cards)
- Machine-1 (Blue), Machine-2 (Green), Machine-3 (Purple)
- Shows: Total production, daily average, working days, entries
- Easy visual comparison of machine efficiency

#### Material Type Analysis (Table)
- Breakdown by material type (S/G, B/P, Burgandy, Others)
- Shows: Blocks processed, total slabs, total sqft, avg sqft/block

#### Top Performing Blocks (Table)
- Top 10 blocks by total square footage
- Shows: Block name, material, times processed, slabs, sqft

**Filters**:
- Year selector (last 5 years)
- Month selector (all months or specific month)
- Date range (from/to)
- Clear filters button

### 5. Navigation

**Updated**: `/components/Sidebar.tsx`

**Production Management Section**:
1. Line Polish Analytics
2. Line Polish Data
3. **Multi Cutter Analytics** ← NEW
4. **Multi Cutter Data** ← NEW

---

## 📊 Business Intelligence Features

### Key Metrics Tracked:
1. **Production Volume**: Total slabs and square footage
2. **Machine Efficiency**: Output per machine per day
3. **Material Distribution**: Which materials are processed most
4. **Block Performance**: Which blocks yield the most
5. **Daily Trends**: Production patterns over time
6. **Week-over-Week Growth**: Trend analysis
7. **Utilization Rate**: Actual vs target performance

### Business Questions Answered:
- ✅ Which machine is performing best/worst?
- ✅ What's the daily production capacity?
- ✅ Is production improving or declining?
- ✅ Which material types dominate production?
- ✅ Which blocks are most productive?
- ✅ Are machines operating at target efficiency?
- ✅ What was the best/worst production day?

---

## 🎨 Design Consistency

### Matching Line Polish Design:
- ✅ Same tile layout (4 columns)
- ✅ Same tile styling (p-4, text-2xl)
- ✅ Similar color scheme (blue, green, purple)
- ✅ Same form structure (JSONB arrays for multiple entries)
- ✅ Same analytics approach (KPIs, trends, breakdowns)
- ✅ Same filtering options (date range, month/year)

### Color Coding:
- **Machine-1**: Blue (primary)
- **Machine-2**: Green (success)
- **Machine-3**: Purple (accent)
- **Improvements**: Green with ↑
- **Declines**: Red with ↓
- **Warnings**: Amber

---

## 📝 Data Flow

### Adding Daily Production:

1. User clicks "Add Multi Cutter Report"
2. Selects date (default: today)
3. For each machine:
   - Adds block rows (block name, material, slabs, sqft)
   - Can add multiple blocks per machine
   - Sees running totals per machine
4. Reviews grand total across all machines
5. Clicks "Save Report"
6. System creates 3 separate database entries (one per machine)
7. Updates summary tiles
8. Displays in grouped date view

### Viewing Analytics:

1. User navigates to "Multi Cutter Analytics"
2. Selects filters (month, year, or date range)
3. System queries analytics endpoint
4. Displays:
   - 8 KPI tiles with key metrics
   - Week-over-week trend comparisons
   - Best/worst day analysis
   - Visual daily performance chart
   - Machine comparison cards
   - Material breakdown table
   - Top blocks table

---

## 🔧 Technical Implementation

### JSONB Structure Benefits:
- ✅ **Flexibility**: Variable number of blocks per machine
- ✅ **Performance**: GIN index for fast JSONB queries
- ✅ **Analytics**: Direct extraction of block-level data
- ✅ **Correctness**: One entry per machine per date (no duplication)

### Calculation Logic:
```typescript
// Machine totals (auto-calculated from blocks)
total_slabs = blocks.reduce((sum, block) => sum + block.slabs, 0)
total_sqft = blocks.reduce((sum, block) => sum + block.sqft, 0)

// Daily averages
avgSqftPerDay = total_sqft / total_days
avgSlabsPerDay = total_slabs / total_days

// Machine efficiency
avgSqftPerMachine = total_sqft / (total_days * active_machines)

// Utilization rate
utilizationRate = (avgSqftPerMachine / targetDailyOutput) * 100

// Week-over-week trend
trend = ((last7DaysAvg - prev7DaysAvg) / prev7DaysAvg) * 100
```

### Edit Functionality:
- Loads existing blocks into form
- Allows modification of all blocks
- Recalculates totals on save
- Maintains data integrity

---

## 🚀 Deployment Steps

### 1. Run Database Migration:
```sql
psql -d your_database -f migrations/create_multi_cutter_reports.sql
```

### 2. Verify Table Created:
```sql
SELECT * FROM multi_cutter_reports LIMIT 1;
```

### 3. Test API Endpoints:
```bash
# List reports
curl http://localhost:3000/api/multi-cutter-reports

# Get analytics
curl http://localhost:3000/api/multi-cutter-reports/analytics
```

### 4. Access Pages:
- Data Entry: `http://localhost:3000/production/multi-cutter`
- Analytics: `http://localhost:3000/production/multi-cutter-analytics`

---

## 📈 Sample Data Entry

**Date**: 2025-10-17

**Machine-1**:
- AVG-16B, S/G: 26 slabs, 721 sqft
- AVG-01A, S/G: 45 slabs, 1282 sqft
- **Total**: 71 slabs, 2003 sqft

**Machine-2**:
- AVG-17C, S/G: 31 slabs, 767 sqft
- AVG-6A, S/G: 8 slabs, 228 sqft
- **Total**: 39 slabs, 995 sqft

**Machine-3**:
- AVG-16A, S/G: 28 slabs, 777 sqft
- AVG-01B, S/G: 44 slabs, 1287 sqft
- **Total**: 72 slabs, 2064 sqft

**Grand Total**: 182 slabs, 5062 sqft

---

## ✅ Quality Checks

- ✅ No breaking changes to existing functionality
- ✅ Line polish data and features remain intact
- ✅ All calculations validated (similar to line polish validation)
- ✅ Responsive design (mobile-friendly)
- ✅ TypeScript type safety throughout
- ✅ Error handling in API and UI
- ✅ Loading states for better UX
- ✅ Empty states with helpful messages

---

## 🎯 Future Enhancements (Optional)

1. **Downtime Tracking**: Record machine downtime/maintenance
2. **Block Inventory Integration**: Link to available blocks
3. **Efficiency Alerts**: Notify when utilization drops below threshold
4. **Export Reports**: PDF/Excel export of analytics
5. **Comparative Analysis**: Compare this month vs last month
6. **Material Cost Tracking**: Add cost per material type
7. **Predictive Analytics**: Forecast production based on trends

---

## 📞 Support

If you need any adjustments or enhancements to this feature, all the code is well-structured and commented for easy modification.

**Key Files**:
- Database: `/migrations/create_multi_cutter_reports.sql`
- API: `/app/api/multi-cutter-reports/route.ts`
- Analytics API: `/app/api/multi-cutter-reports/analytics/route.ts`
- Data Entry: `/app/production/multi-cutter/page.tsx`
- Analytics: `/app/production/multi-cutter-analytics/page.tsx`
- Navigation: `/components/Sidebar.tsx`
