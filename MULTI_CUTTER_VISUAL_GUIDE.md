# Multi-Cutter Visual Reference Guide

## 📱 User Interface Overview

### 1. Multi Cutter Data Entry Page
**URL**: `/production/multi-cutter`

```
┌─────────────────────────────────────────────────────────────┐
│  Multi Cutter Production Data                 [+ Add Report]│
│  Track daily granite block cutting from 3 machines          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐
│  │Total Produc │ │ Total Area  │ │Today's Prod │ │ Active  │
│  │    5,245    │ │   143,210   │ │    5,062    │ │    3    │
│  │ Slabs Cut   │ │Sq. Ft. Prod │ │Sq. Ft. Today│ │ Cutters │
│  │   [Layers]  │ │[BarChart3]  │ │[TrendingUp] │ │[Factory]│
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘
│
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  │ Machine-1     │ │ Machine-2     │ │ Machine-3     │
│  │   45,230      │ │   48,125      │ │   49,855      │
│  │Sq. Ft. Prod   │ │Sq. Ft. Prod   │ │Sq. Ft. Prod   │
│  │  [Factory]    │ │  [Factory]    │ │  [Factory]    │
│  │  BLUE BG      │ │  GREEN BG     │ │  PURPLE BG    │
│  └───────────────┘ └───────────────┘ └───────────────┘
├─────────────────────────────────────────────────────────────┤
│  FILTERS:                                                    │
│  From Date [______] To Date [______] [Clear Filters]        │
├─────────────────────────────────────────────────────────────┤
│  📅 17 October 2025   Total: 5,062 Sq. Ft.                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🏭 Machine-1  Total: 71 Slabs | 2,003 Sq. Ft. [✏️][🗑️]│ │
│  │ ┌────────────────────────────────────────────────────┐ │ │
│  │ │Block Name │ Material │ Slabs │ Sq. Ft.            │ │ │
│  │ │ AVG-16B   │   S/G    │  26   │  721               │ │ │
│  │ │ AVG-01A   │   S/G    │  45   │ 1,282              │ │ │
│  │ └────────────────────────────────────────────────────┘ │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 🏭 Machine-2  Total: 39 Slabs | 995 Sq. Ft. [✏️][🗑️] │ │
│  │ ┌────────────────────────────────────────────────────┐ │ │
│  │ │Block Name │ Material │ Slabs │ Sq. Ft.            │ │ │
│  │ │ AVG-17C   │   S/G    │  31   │  767               │ │ │
│  │ │ AVG-6A    │   S/G    │   8   │  228               │ │ │
│  │ └────────────────────────────────────────────────────┘ │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 🏭 Machine-3  Total: 72 Slabs | 2,064 Sq. Ft. [✏️][🗑️]│ │
│  │ ┌────────────────────────────────────────────────────┐ │ │
│  │ │Block Name │ Material │ Slabs │ Sq. Ft.            │ │ │
│  │ │ AVG-16A   │   S/G    │  28   │  777               │ │ │
│  │ │ AVG-01B   │   S/G    │  44   │ 1,287              │ │ │
│  │ └────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. Add/Edit Form
**Triggered by**: "Add Multi Cutter Report" button or Edit icon

```
┌─────────────────────────────────────────────────────────────┐
│  Add Multi Cutter Report                                     │
│  (Highlighted with bg-indigo-50)                             │
├─────────────────────────────────────────────────────────────┤
│  Date: [2025-10-17]                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─ MACHINE-1 (BLUE BORDER) ────────────────────────────┐   │
│  │ 🏭 Machine-1 Blocks              [+ Add Block]       │   │
│  │ ┌──────────────────────────────────────────────────┐ │   │
│  │ │Block Name    Material  Slabs  Sq.Ft.      [🗑️] │ │   │
│  │ │[AVG-16B]     [S/G ▼]   [26]   [721]            │ │   │
│  │ └──────────────────────────────────────────────────┘ │   │
│  │ ┌──────────────────────────────────────────────────┐ │   │
│  │ │[AVG-01A]     [S/G ▼]   [45]   [1282]      [🗑️] │ │   │
│  │ └──────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Machine-1 Total: 71 Slabs | 2,003 Sq. Ft.           │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ MACHINE-2 (GREEN BORDER) ───────────────────────────┐   │
│  │ 🏭 Machine-2 Blocks              [+ Add Block]       │   │
│  │ (Similar structure as Machine-1)                     │   │
│  │ Machine-2 Total: 39 Slabs | 995 Sq. Ft.             │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ MACHINE-3 (PURPLE BORDER) ──────────────────────────┐   │
│  │ 🏭 Machine-3 Blocks              [+ Add Block]       │   │
│  │ (Similar structure as Machine-1)                     │   │
│  │ Machine-3 Total: 72 Slabs | 2,064 Sq. Ft.           │   │
│  └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║ Total Production (All Machines)                       ║  │
│  ║ Total Slabs: 182    Total Sq. Ft.: 5,062             ║  │
│  ║ (Gradient purple/indigo background)                   ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                               │
│  [Save Report] [Cancel]                                      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Multi Cutter Analytics Page
**URL**: `/production/multi-cutter-analytics`

```
┌─────────────────────────────────────────────────────────────┐
│  Multi-Cutter Analytics              [+ Add Multi Cutter...]│
│  Production Performance & Machine Efficiency Tracking        │
├─────────────────────────────────────────────────────────────┤
│  FILTERS:                                                    │
│  Year [2025▼] Month [All▼] From [___] To [___] [Clear]     │
├─────────────────────────────────────────────────────────────┤
│  ROW 1: KEY PRODUCTION METRICS                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐
│  │Total Produc │ │ Total Area  │ │Working Days │ │ Active  │
│  │    5,245    │ │   143,210   │ │     28      │ │    3    │
│  │ Slabs Cut   │ │Sq. Ft. Prod │ │Production   │ │ Machines│
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘
│
│  ROW 2: EFFICIENCY METRICS (COLORED BACKGROUNDS)             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐
│  │Daily Avg    │ │Slabs/Day    │ │Machine Eff. │ │Utilizat.│
│  │   5,115     │ │    187      │ │   1,705     │ │   85%   │
│  │Sq.Ft./Day   │ │Daily Avg    │ │Sqft/Mach/Day│ │Target:  │
│  │(GREEN BG)   │ │(BLUE BG)    │ │(PURPLE BG)  │ │2000sqft │
│  └─────────────┘ └─────────────┘ └─────────────┘ │(AMBER BG│
│                                                    └─────────┘
│
│  PERFORMANCE TRENDS (2 CARDS SIDE-BY-SIDE)                   │
│  ┌─────────────────────────────┐ ┌──────────────────────────┐
│  │ Slabs Trend (Last 7 days)   │ │ SqFt Trend (Last 7 days) │
│  │ 192.3 avg slabs/day          │ │ 5,234 avg sqft/day       │
│  │ [TrendingUp icon]            │ │ [TrendingUp icon]        │
│  │ ↑ 12.3% vs previous week     │ │ ↑ 8.5% vs previous week  │
│  │ (Green badge if positive)    │ │ (Green badge if positive)│
│  └─────────────────────────────┘ └──────────────────────────┘
│
│  BEST & WORST DAYS (2 CARDS)                                 │
│  ┌──────────────────────────┐ ┌─────────────────────────────┐
│  │ ⭐ Best Performance Day  │ │ ⚠️ Needs Improvement Day   │
│  │ (GREEN BACKGROUND)       │ │ (RED BACKGROUND)            │
│  │ 15 October 2025          │ │ 12 October 2025             │
│  │ Slabs: 225  SqFt: 6,234  │ │ Slabs: 124  SqFt: 3,125     │
│  │ Machines: 3  Avg: 2,078  │ │ Machines: 2  Avg: 1,562     │
│  └──────────────────────────┘ └─────────────────────────────┘
│
│  DAILY PERFORMANCE CHART                                     │
│  ┌──────────────────────────────────────────────────────────┐
│  │ 📊 Daily Production Trend            Last 15 days        │
│  │ 17 Oct  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 5,062 sqft  105 slabs 3m   │
│  │ 16 Oct  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 4,523 sqft     98 slabs 3m     │
│  │ 15 Oct  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 6,234 sqft 225 slabs 3m   │
│  │ ...                                                       │
│  │ (Horizontal bar chart with gradient purple bars)         │
│  └──────────────────────────────────────────────────────────┘
│
│  MACHINE PERFORMANCE COMPARISON (3 CARDS)                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐
│  │ Machine-1  │ │ Machine-2  │ │ Machine-3  │
│  │ (BLUE BG)  │ │ (GREEN BG) │ │ (PURPLE BG)│
│  │ 28 days    │ │ 28 days    │ │ 26 days    │
│  │ Prod: 1,785│ │ Prod: 1,812│ │ Prod: 1,648│
│  │ slabs      │ │ slabs      │ │ slabs      │
│  │ 48,230sqft │ │ 51,125sqft │ │ 43,855sqft │
│  │ Daily: 1723│ │ Daily: 1826│ │ Daily: 1687│
│  │ 28 entries │ │ 28 entries │ │ 26 entries │
│  └────────────┘ └────────────┘ └────────────┘
│
│  MATERIAL TYPE ANALYSIS (TABLE)                              │
│  ┌──────────────────────────────────────────────────────────┐
│  │ 📦 Material Type Analysis                                │
│  ├─────────┬──────────┬─────────┬─────────┬───────────────┤
│  │Material │ Blocks   │  Slabs  │ Sq. Ft. │ Avg Sqft/Block│
│  ├─────────┼──────────┼─────────┼─────────┼───────────────┤
│  │  S/G    │   156    │  3,245  │ 98,234  │     629       │
│  │  B/P    │    45    │    989  │ 28,125  │     625       │
│  │ Burgandy│    12    │    256  │  7,856  │     655       │
│  │ Others  │     8    │    145  │  4,125  │     516       │
│  └─────────┴──────────┴─────────┴─────────┴───────────────┘
│
│  TOP PERFORMING BLOCKS (TABLE)                               │
│  ┌──────────────────────────────────────────────────────────┐
│  │ 📏 Top Performing Blocks                                 │
│  ├──────────┬──────────┬───────┬────────┬──────────────────┤
│  │Block Name│ Material │ Times │ Slabs  │    Sq. Ft.       │
│  ├──────────┼──────────┼───────┼────────┼──────────────────┤
│  │ AVG-16B  │   S/G    │  12   │  312   │     8,652        │
│  │ AVG-01A  │   S/G    │  15   │  675   │    19,230        │
│  │ AVG-17C  │   S/G    │   9   │  279   │     6,903        │
│  │ ...                                                       │
│  └──────────┴──────────┴───────┴────────┴──────────────────┘
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Legend

### Tile Colors
- **Purple/Indigo**: Total production metrics
- **Orange**: Area/sqft metrics
- **Blue**: Days/time metrics
- **Teal**: Machine counts
- **Green (BG)**: Daily output efficiency
- **Blue (BG)**: Slabs per day
- **Purple (BG)**: Machine efficiency
- **Amber (BG)**: Utilization rate

### Status Colors
- **Green**: Good performance, trending up ↑
- **Red**: Needs attention, trending down ↓
- **Blue**: Machine-1 sections
- **Green**: Machine-2 sections
- **Purple**: Machine-3 sections
- **Gradient**: Grand totals, important summaries

---

## 📋 Form Field Details

### Material Type Dropdown Options
- S/G (Shivakashi Granite)
- B/P (Black Pearl)
- Burgandy
- Others

### Machine Names (Fixed)
- Machine-1
- Machine-2
- Machine-3

### Required Fields
- ✅ Date (defaults to today)
- ✅ At least one block for at least one machine
- ✅ Block name
- ✅ Slabs count
- ✅ Square footage

### Optional
- Can skip entire machines if not operational
- Material type defaults to S/G

---

## 🔢 Calculation Examples

### Machine Total
```
Machine-1 Blocks:
  AVG-16B: 26 slabs, 721 sqft
  AVG-01A: 45 slabs, 1282 sqft
  
Machine-1 Total:
  Slabs: 26 + 45 = 71
  SqFt: 721 + 1282 = 2,003
```

### Grand Total
```
Machine-1: 71 slabs, 2,003 sqft
Machine-2: 39 slabs, 995 sqft
Machine-3: 72 slabs, 2,064 sqft

Grand Total:
  Slabs: 71 + 39 + 72 = 182
  SqFt: 2,003 + 995 + 2,064 = 5,062
```

### Analytics Calculations
```
Daily Average:
  Total SqFt (143,210) ÷ Working Days (28) = 5,115 sqft/day

Machine Efficiency:
  Total SqFt (143,210) ÷ (Working Days (28) × Machines (3))
  = 143,210 ÷ 84 = 1,705 sqft/machine/day

Utilization:
  (Actual Output (1,705) ÷ Target (2,000)) × 100 = 85%

Week-over-Week Trend:
  ((Last 7 Days Avg - Previous 7 Days Avg) ÷ Previous 7 Days Avg) × 100
  = ((5,234 - 4,831) / 4,831) × 100 = +8.5%
```

---

## 🎯 UI States

### Loading State
```
┌─────────────────────────────────────┐
│                                     │
│  Loading multi-cutter reports...   │
│                                     │
└─────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────┐
│         ⚠️                          │
│  No production records found        │
│  Start by adding a new multi-cutter │
│  report                             │
└─────────────────────────────────────┘
```

### Form Validation
- Empty block name → Border turns red
- Missing slabs/sqft → Button disabled
- Invalid numbers → Browser validation message

---

## 📱 Responsive Behavior

### Desktop (>768px)
- 4 tiles per row
- 3 machine cards in a row
- Side-by-side trend cards
- Full-width tables

### Mobile (<768px)
- 1 tile per row (stacked)
- 1 machine card per row
- Stacked trend cards
- Horizontally scrollable tables

---

This visual guide should help you understand exactly how everything looks and works!
