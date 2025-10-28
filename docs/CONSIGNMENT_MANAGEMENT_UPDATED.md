# Consignment Management - Updated Structure

## Overview
The consignment management system has been simplified and corrected based on the actual business requirement: **Consignments already group multiple blocks together**. No additional "grouping" feature is needed.

## Business Process Flow
1. **Purchase Consignment** - Buy multiple granite blocks (AVG-1, AVG-2, AVG-3) from supplier as one consignment
2. **Store Blocks** - Blocks are stored and tracked via the granite_blocks table linked to consignment
3. **Cut into Parts** - Each block is divided into parts (AVG-1A, AVG-1B, AVG-2A) in multi-cutter
4. **Polish** - Parts go through line-polish processing
5. **View Production** - See production summary showing all blocks in a consignment

## Database Structure

### Existing Tables (Correct Implementation)
```sql
-- Main consignment record
granite_consignments
  - id (primary key)
  - consignment_number
  - supplier_id
  - arrival_date
  - payment_cash
  - payment_upi
  - transport_cost
  - notes
  
-- Blocks in the consignment (one-to-many relationship)
granite_blocks
  - id (primary key)
  - consignment_id (foreign key → granite_consignments.id)
  - block_no (e.g., AVG-1, AVG-2, AVG-3)
  - grade (S/G, A, B, C)
  - gross_measurement
  - net_measurement
  - status
```

### Production Views (Already Correct)
```sql
-- Aggregates production per block (parts like AVG-1A, AVG-1B rolled up to AVG-1)
consignment_block_production_summary

-- Aggregates all blocks per consignment
consignment_production_summary
  - Groups all production for all blocks in a consignment
  - Separates multi_cutter_sqft and line_polish_sqft (not added together!)
  - Calculates efficiency based on line-polish (final stage)
```

## Pages Structure

### 1. Add Consignment (`/consignments/add`)
**NEW PAGE** - Main entry point for creating consignments

**Features:**
- Form to enter consignment details (number, supplier, dates, payments)
- Dynamic block input section
- Add multiple blocks with:
  - Block number (e.g., AVG-1, AVG-2, AVG-3)
  - Grade (S/G, A, B, C)
  - Gross measurement (tons)
  - Net measurement (tons)
- Add/Remove block rows dynamically
- Saves consignment + all blocks in one transaction

**API Calls:**
- POST `/api/granite-consignments` - Create consignment
- POST `/api/granite-blocks` with `{ blocks: [...] }` - Bulk create blocks

### 2. All Consignments (`/consignments`)
**EXISTING PAGE** - List view with production summaries

**Features:**
- Shows all consignments with supplier, dates, status
- Expandable sections showing BlockProductionSummary component
- Production summary shows:
  - All blocks in the consignment
  - Each block's parts (AVG-1A, AVG-1B)
  - Multi-cutter production (orange columns)
  - Line-polish production (purple columns)
  - Efficiency calculations

**Components Used:**
- `BlockProductionSummary.tsx` - Color-coded MC/LP data display

### 3. Consignment Calculator (`/consignments/calculator`)
**EXISTING PAGE** - Cost calculation tool

**Purpose:** Calculate costs, profit margins, pricing for consignments

## Block Naming Convention

### Base Blocks (Entered in "Add Consignment")
```
AVG-1
AVG-2
AVG-3
```

### Block Parts (Entered in Multi-Cutter/Line-Polish)
```
AVG-1A
AVG-1B
AVG-1C
AVG-2A
AVG-2B
```

The SQL function `extract_base_block_name()` automatically maps parts back to base blocks:
- AVG-1A → AVG-1
- AVG-1B → AVG-1
- AVG-2A → AVG-2

## Sidebar Menu

### Consignment Management Section
1. **Add Consignment** → `/consignments/add` (NEW)
2. **All Consignments** → `/consignments`
3. **Consignment Calculator** → `/consignments/calculator`

**Removed (incorrect implementation):**
- ❌ Consignment Grouping - Not needed (blocks already grouped by consignment)
- ❌ Consignment Summaries - Duplicate of main page functionality
- ❌ Slab Processing - Unclear purpose

## API Endpoints

### Consignments
- `POST /api/granite-consignments` - Create new consignment
- `GET /api/granite-consignments` - List all consignments
- `GET /api/granite-consignments/[id]` - Get single consignment
- `GET /api/granite-consignments/[id]/production-summary` - Get production for consignment

### Blocks
- `POST /api/granite-blocks` - Create single block OR bulk create
  - Single: `{ consignment_id, block_no, grade, measurements }`
  - Bulk: `{ blocks: [{ consignment_id, block_no, ... }, ...] }`
- `GET /api/granite-blocks?consignment_id=xxx` - Get blocks for consignment

## Production Tracking

### Multi-Cutter Reports
- JSONB field: `blocks` array
- Each block has: `{ block_name: "AVG-1A", sqft: 150, ... }`

### Line-Polish Reports
- JSONB field: `activities` array
- Each activity has: `{ block_name: "AVG-1A", sqft: 145, ... }`

### SQL Views Join Process
1. Extract block_name from JSONB using `jsonb_array_elements()`
2. Use `extract_base_block_name()` to map parts to base blocks
3. Join granite_blocks via block_no matching base block name
4. Join granite_consignments via consignment_id
5. Aggregate production by consignment_id
6. Keep multi_cutter_sqft and line_polish_sqft **SEPARATE** (FULL OUTER JOIN)

## Key Insights

### What Was Wrong
- Agent created complex "grouping" system with new tables
- Thought user wanted to group AVG-1, AVG-2, AVG-3 as a NEW feature
- Misunderstood: blocks are ALREADY grouped by being in one consignment!

### What's Correct
- Database already has one-to-many relationship (consignment → blocks)
- SQL views already aggregate production by consignment
- Just needed better UI for adding blocks during consignment creation
- Production summaries were already implemented, just hidden in expandable sections

## Usage Example

### Creating a New Consignment
1. Go to **Add Consignment** page
2. Enter consignment number (auto-generated or custom)
3. Select supplier from dropdown
4. Enter arrival date, payment details, transport cost
5. In the Blocks section:
   - Click "Add Block" to add rows
   - Enter block numbers: AVG-1, AVG-2, AVG-3
   - Enter grade, measurements for each
6. Click "Create Consignment"
7. System saves consignment + all 3 blocks atomically

### Processing the Consignment
1. Go to **Multi-Cutter** page
2. Select date, add blocks: AVG-1A (50 sqft), AVG-1B (45 sqft), AVG-2A (60 sqft)
3. Save report

4. Go to **Line-Polish** page
5. Select date, add activities: AVG-1A (48 sqft), AVG-1B (43 sqft), AVG-2A (58 sqft)
6. Save report

### Viewing Production Summary
1. Go to **All Consignments** page
2. Find the consignment in the list
3. Click to expand the production summary section
4. See:
   - Block AVG-1: MC = 95 sqft (50+45), LP = 91 sqft (48+43)
   - Block AVG-2: MC = 60 sqft, LP = 58 sqft
   - Total: MC = 155 sqft, LP = 149 sqft
   - Efficiency: 96.1% (based on LP as final stage)

## Next Steps (Optional Enhancements)

1. **Make production summaries more visible** - Default expand or add "View Production" button
2. **Add consignment status workflow** - Track RECEIVED → PROCESSING → COMPLETED
3. **Link blocks to sales** - Track which blocks are sold, remaining
4. **Add consignment search/filter** - By supplier, date range, status
5. **Consignment analytics dashboard** - Show top suppliers, average processing time, profit margins

## Files Modified

### Created
- `app/consignments/add/page.tsx` - New consignment creation form

### Updated
- `app/api/granite-blocks/route.ts` - Added bulk insert support
- `components/Sidebar.tsx` - Updated menu structure

### Deleted (Incorrect Implementation)
- `app/consignments/grouping/` - Entire grouping feature
- `app/consignments/summaries/` - Duplicate functionality
- `app/consignments/new/` - Old version (replaced with /add)
- `app/consignments/slab-processing/` - Unclear purpose
- `app/api/consignment-groups/` - All grouping endpoints
- `migrations/create_consignment_groups.sql` - Unnecessary tables
- `docs/CONSIGNMENT_GROUPING_FEATURE.md` - Outdated documentation

### Kept (Correct Implementation)
- `migrations/create_consignment_production_summary_view.sql` - Core production tracking
- `components/BlockProductionSummary.tsx` - Color-coded UI component
- `app/consignments/page.tsx` - Main list with summaries
- `app/consignments/calculator/page.tsx` - Cost calculator tool

---

**Last Updated:** After cleanup and rebuild based on correct business requirement understanding
