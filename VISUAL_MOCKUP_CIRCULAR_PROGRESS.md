# Visual Mockup: Circular Progress Discs

## What You'll See in the Analytics Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🏭 Machine Performance Comparison                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │   Machine-1      │  │   Machine-2      │  │   Machine-3      │     │
│  │   🏷️ 22 days    │  │   🏷️ 24 days    │  │   🏷️ 20 days    │     │
│  │                  │  │                  │  │                  │     │
│  │       ████       │  │       ████       │  │       ████       │     │
│  │     ██    ██     │  │     ██████       │  │     ██    ██     │     │
│  │   ██   73%  ██   │  │   ████ 91% ████  │  │   ██   68%  ██   │     │
│  │   ██ of     ██   │  │   ████of   ████  │  │   ██ of     ██   │     │
│  │   ██ target ██   │  │   ████target████  │  │   ██ target ██   │     │
│  │     ██    ██     │  │     ██████       │  │     ██    ██     │     │
│  │       ████       │  │       ████       │  │       ████       │     │
│  │    [Blue disc]   │  │   [Green disc]   │  │  [Purple disc]   │     │
│  │                  │  │                  │  │                  │     │
│  │ Production:      │  │ Production:      │  │ Production:      │     │
│  │  29,250 sqft     │  │  36,400 sqft     │  │  27,200 sqft     │     │
│  │                  │  │                  │  │                  │     │
│  │ Target:          │  │ Target:          │  │ Target:          │     │
│  │  40,000 sqft     │  │  40,000 sqft     │  │  40,000 sqft     │     │
│  │                  │  │                  │  │                  │     │
│  │ Remaining:       │  │ Remaining:       │  │ Remaining:       │     │
│  │  10,750 sqft 🟠  │  │  3,600 sqft 🟠   │  │  12,800 sqft 🟠  │     │
│  │                  │  │                  │  │                  │     │
│  │ Daily Avg:       │  │ Daily Avg:       │  │ Daily Avg:       │     │
│  │  1,330 sqft/day  │  │  1,517 sqft/day  │  │  1,360 sqft/day  │     │
│  │                  │  │                  │  │                  │     │
│  │ Entries: 22      │  │ Entries: 24      │  │ Entries: 20      │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                          │
│  Legend:                                                                 │
│  ████ = Filled portion (actual production)                              │
│  ░░░░ = Unfilled portion (remaining to target)                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Progress Visualization Examples

### Example 1: Early Stage (25% complete)
```
       ████
     ██    ░░
   ██   25%  ░░
   ██ of     ░░
   ██ target ░░
     ██    ░░
       ████
   
Production: 10,000 / 40,000 sqft
Status: On track if early in month
```

### Example 2: Halfway (50% complete)
```
       ████
     ████  ░░
   ████ 50% ░░
   ████of   ░░
   ████target░
     ████  ░░
       ████
   
Production: 20,000 / 40,000 sqft
Status: Good pace at mid-month
```

### Example 3: Almost There (87% complete)
```
       ████
     ██████░
   ████ 87% █
   ████of   █
   ████target█
     ██████░
       ████
   
Production: 34,800 / 40,000 sqft
Status: Excellent, nearing target
```

### Example 4: Target Met! (100% complete)
```
       ████
     ██████
   ████100%████
   ████of   ████
   ████target████
     ██████
       ████
   
Production: 40,000 / 40,000 sqft
Status: 🎉 Goal achieved!
Remaining: 0 sqft (shown in green)
```

### Example 5: Exceeded Target (108% capped at 100%)
```
       ████
     ██████
   ████100%████
   ████of   ████
   ████target████
     ██████
       ████
   
Production: 43,200 / 40,000 sqft
Display: 100% (visual cap)
Remaining: 0 sqft ✅
Note: Over-achiever! 🌟
```

---

## How It Works with Your Data Entry

### Scenario: October 2025

#### Week 1 (Days 1-7)
```
You add daily reports:
- Oct 1: Machine-1 = 1,800 sqft
- Oct 2: Machine-1 = 2,100 sqft
- Oct 3: Machine-1 = 1,950 sqft
...

Total after Week 1: 9,500 sqft
Progress disc shows: 24% filled (dark blue)
```

#### Week 2 (Days 8-14)
```
More reports added:
- Oct 8: Machine-1 = 2,200 sqft
- Oct 9: Machine-1 = 1,750 sqft
...

Total after Week 2: 18,900 sqft
Progress disc shows: 47% filled (dark blue)
```

#### Week 3 (Days 15-21)
```
Continue adding:
- Oct 15: Machine-1 = 2,000 sqft
- Oct 16: Machine-1 = 2,150 sqft
...

Total after Week 3: 28,400 sqft
Progress disc shows: 71% filled (dark blue)
```

#### Week 4 (Days 22-31)
```
Final push:
- Oct 22: Machine-1 = 2,300 sqft
- Oct 23: Machine-1 = 2,050 sqft
...

Total after Month: 41,200 sqft
Progress disc shows: 100% filled (capped) ✅
```

---

## Color Indicators

### Progress Ring Colors
- 🔵 **Machine-1**: Dark Blue (`#1e40af`) - Solid, dependable
- 🟢 **Machine-2**: Dark Green (`#15803d`) - Growth, success
- 🟣 **Machine-3**: Dark Purple (`#7e22ce`) - Premium quality

### Remaining Status Colors
- 🟠 **Amber**: Still work needed (< 100%)
- 🟢 **Green**: Target met or exceeded (≥ 100%)

---

## Interaction Flow

1. **User selects month** → October 2025
2. **System calculates**:
   - Total sqft for Machine-1 in October
   - Percentage: (actual / 40,000) × 100
3. **Disc animates** → Fills from 0% to actual percentage over 1 second
4. **Numbers update** → Production, Target, Remaining all shown
5. **User sees instant status** → Quick visual confirmation

---

## Real-World Example

### Your Current Data (hypothetical):
```
Date Range: October 1-18, 2025

Machine-1: 22 entries
  Total: 29,250 sqft
  Target: 40,000 sqft
  Progress: 73%
  Remaining: 10,750 sqft
  Days left: 13 days
  Need: 827 sqft/day to hit target
  
Machine-2: 24 entries  
  Total: 36,400 sqft
  Target: 40,000 sqft
  Progress: 91%
  Remaining: 3,600 sqft
  Days left: 13 days
  Need: 277 sqft/day to hit target
  
Machine-3: 20 entries
  Total: 27,200 sqft
  Target: 40,000 sqft
  Progress: 68%
  Remaining: 12,800 sqft
  Days left: 13 days
  Need: 985 sqft/day to hit target
```

### Visual Result:
```
Machine-1: 73% filled (good pace)
Machine-2: 91% filled (excellent, almost there!)
Machine-3: 68% filled (needs acceleration)
```

---

## Benefits At a Glance

✅ **Instant Status**: See performance in 1 second  
✅ **Visual Appeal**: Looks like actual cutting disc  
✅ **Clear Target**: 40,000 sqft goal always visible  
✅ **Progress Tracking**: Daily accumulation shown  
✅ **Comparison**: 3 machines side-by-side  
✅ **Actionable**: Shows remaining work needed  
✅ **Motivating**: Visual progress encourages achievement

---

## Technical Implementation

```typescript
// 1. Get machine data from API
const machineBreakdown = analytics.machine_breakdown;

// 2. Set monthly target
const monthlyTarget = 40000;

// 3. Calculate progress
const progressPercentage = (machine.sqft / monthlyTarget) * 100;

// 4. Calculate circle geometry
const radius = 60;
const circumference = 2 * π * radius = 377;
const fillLength = (progressPercentage / 100) * 377;

// 5. Render SVG circle with strokeDasharray trick
<circle
  r="60"
  stroke="darkblue"
  strokeDasharray="377"           // Full circle
  strokeDashoffset={377 - fillLength}  // Creates gap
/>

// Result: Disc appears filled to the calculated percentage!
```

---

This creates a beautiful, functional, and business-relevant visualization that looks like the actual granite cutting discs in your workshop! 🎯
