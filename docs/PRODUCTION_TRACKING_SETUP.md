# Production Tracking Setup Guide

## Overview
This system tracks production data from Multi-Cutter and Line-Polish stages, linking them to consignments and blocks.

## How It Works

### 1. Block Naming Convention
Your `granite_blocks` table has blocks like:
- `AVG-1`
- `AVG-2`
- `AVG-3`

When you cut these blocks, they create **parts**: `AVG-1A`, `AVG-1B`, `AVG-1C`, etc.

### 2. Data Flow

```
Consignment → Blocks → Multi-Cutter (Cut) → Line-Polish (Polish)
  CNS-001      AVG-1     AVG-1A (1200 sqft)   AVG-1A (1150 sqft)
                         AVG-1B (980 sqft)     AVG-1B (950 sqft)
```

### 3. Required Data Format

#### Multi-Cutter Reports (`multi_cutter_reports.blocks`):
```json
[
  {
    "block_name": "AVG-1A",
    "material_type": "S/G",
    "slabs": 15,
    "sqft": 1200
  },
  {
    "block_name": "AVG-1B",
    "material_type": "S/G",
    "slabs": 12,
    "sqft": 980
  }
]
```

#### Line-Polish Reports (`line_polish_reports.activities`):
```json
[
  {
    "block_name": "AVG-1A",
    "activity": "Polishing",
    "slabs": 15,
    "sqft": 1150
  },
  {
    "block_name": "AVG-1B",
    "activity": "Polishing",
    "slabs": 12,
    "sqft": 950
  }
]
```

## Setup Steps

### Step 1: Check Your Existing Data

Run `/migrations/check_existing_production_data.sql` in Supabase to see:
1. If `block_name` field exists in your current data
2. What fields your existing JSONB entries have
3. How many records have production data

### Step 2A: If `block_name` EXISTS (Future is Ready!)

If your existing data already has the `block_name` field:

1. Run the migrations:
```sql
-- Drop existing views (if any)
DROP VIEW IF EXISTS consignment_production_summary CASCADE;
DROP VIEW IF EXISTS consignment_block_production_summary CASCADE;
DROP FUNCTION IF EXISTS extract_base_block_name(TEXT) CASCADE;

-- Run prerequisite (if not done)
-- Run: /migrations/00_prerequisite_add_activities_column.sql

-- Run main migration
-- Run: /migrations/create_consignment_production_summary_view.sql
```

2. Navigate to `/consignments` page
3. Click expand (▼) on any consignment
4. You should see production data immediately!

### Step 2B: If `block_name` DOES NOT EXIST (Need Migration)

If your existing data does NOT have `block_name` field, you have two options:

#### Option 1: Backfill Existing Data (Recommended if you have a lot of historical data)

Create a migration script to add `block_name` to existing records. This requires:
- Understanding your current JSONB structure
- Mapping existing fields to block names
- Running an UPDATE query

#### Option 2: Start Fresh for Future (Easier)

1. Keep using the system normally
2. Going forward, when entering Multi-Cutter and Line-Polish data, include the `block_name` field
3. Historical data won't show in production summary (only new data will)

## How the View Matches Data

The SQL view does this magic:

```sql
-- Step 1: Extract base block name
"AVG-1A" → "AVG-1" (removes trailing letter)

-- Step 2: Match with granite_blocks
JOIN granite_blocks WHERE block_no = "AVG-1"

-- Step 3: Aggregate by parts
Group: AVG-1, Part A → Multi-Cutter: 1200 sqft, Line-Polish: 1150 sqft
Group: AVG-1, Part B → Multi-Cutter: 980 sqft,  Line-Polish: 950 sqft

-- Step 4: Show on Consignments Page
Consignment → Block AVG-1 → Parts [A, B] with separate MC/LP data
```

## Testing

### Test with Sample Data

Run this in Supabase to add test data:

```sql
-- Add sample multi-cutter data
INSERT INTO multi_cutter_reports (date, machine, blocks, total_slabs, total_sqft)
VALUES (
  CURRENT_DATE,
  'Machine-1',
  '[
    {"block_name": "AVG-1A", "material_type": "S/G", "slabs": 15, "sqft": 1200},
    {"block_name": "AVG-1B", "material_type": "S/G", "slabs": 12, "sqft": 980}
  ]'::jsonb,
  27,
  2180
);

-- Add sample line-polish data
INSERT INTO line_polish_reports (date, shift, activities)
VALUES (
  CURRENT_DATE,
  'Day',
  '[
    {"block_name": "AVG-1A", "activity": "Polishing", "slabs": 15, "sqft": 1150},
    {"block_name": "AVG-1B", "activity": "Polishing", "slabs": 12, "sqft": 950}
  ]'::jsonb
);

-- Verify the data appears
SELECT * FROM consignment_production_summary LIMIT 5;
```

## UI Display

Once data is available, the consignments page will show:

```
┌─────────────────────────────────────────────────────┐
│ Production Summary                                   │
│ Multi-Cutter SqFt: 2,180  |  Line-Polish SqFt: 2,100│
├─────────────────────────────────────────────────────┤
│ Block: AVG-1                                         │
│   Multi-Cutter: 2,180 sqft (27 slabs)              │
│   Line-Polish: 2,100 sqft (27 slabs)                │
│                                                       │
│   Parts Details:                                     │
│   Part │ Multi-Cutter │ Line-Polish │ Source │      │
│   A    │ 1200  15     │ 1150  15    │ MC+LP  │      │
│   B    │  980  12     │  950  12    │ MC+LP  │      │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### No data showing?
1. Check if `block_name` field exists in JSONB
2. Verify block names match format: `AVG-1A`, `AVG-2B`, etc.
3. Ensure blocks exist in `granite_blocks` table with base names: `AVG-1`, `AVG-2`
4. Check views are created: `SELECT * FROM consignment_production_summary LIMIT 1;`

### Data shows for some blocks but not others?
1. Block names must match: Base block (`AVG-1`) + Part letter (`A`, `B`, `C`)
2. Check spelling and case sensitivity
3. Verify the `extract_base_block_name()` function works: `SELECT extract_base_block_name('AVG-1A');`

### Efficiency showing 0%?
1. Check if `gross_measurement` exists in `granite_blocks`
2. Verify Line-Polish data exists (efficiency based on polished output)
3. Formula: `(line_polish_sqft / (gross_measurement * 300)) * 100`

## Next Steps

1. Run `check_existing_production_data.sql` to see your current data structure
2. Based on results, decide: backfill old data OR start fresh
3. Run migrations if not already done
4. Test with one consignment
5. Update Multi-Cutter and Line-Polish entry forms to include `block_name` field going forward
