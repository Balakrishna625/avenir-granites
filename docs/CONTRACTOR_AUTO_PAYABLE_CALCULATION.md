# Contractor Auto-Payable Calculation Feature

## Overview
Automatic calculation of contractor payables based on their **PREVIOUS month's work output** for months starting from **March 2026 onwards** (based on February 2026 data), with the ability to **manually adjust** amounts when needed.

## Payment Timeline Logic

The contractor payment system follows a **previous month payment model**:
- **February 2026 sales/hours** → **Paid in March 2026**
- **March 2026 sales/hours** → **Paid in April 2026**
- **April 2026 sales/hours** → **Paid in May 2026**

This ensures contractors receive payment for their work in the following month.

## Calculation Rules

### Contractor Dinesh
- **Formula**: Previous Month's Total Square Feet Sold × ₹6 per SqFt
- **Data Source**: Sales records from `sales` table (previous month)
- **Rate**: ₹6 per square foot
- **Example**: 
  - March 2026 payable = February 2026 sales
  - If 2,500 SqFt sold in Feb 2026 → March 2026 Payable = 2,500 × 6 = ₹15,000
  - If 3,005 SqFt sold in March 2026 → April 2026 Payable = 3,005 × 6 = ₹18,030

### Contractor LinePolish
- **Formula**: Previous Month's Total Hours Worked × ₹250 per hour
- **Data Source**: Line polish reports from `line_polish_reports` table (previous month)
- **Rate**: ₹250 per hour
- **Example**: 
  - March 2026 payable = February 2026 hours
  - If 35 hours worked in Feb 2026 → March 2026 Payable = 35 × 250 = ₹8,750
  - If 40 hours worked in March 2026 → April 2026 Payable = 40 × 250 = ₹10,000

### Carry Forward Balance
Any unpaid balance from the previous month is automatically carried forward:
- **Example for April 2026**:
  - Carry Forward from March: ₹7,000
  - April Payable (based on March data): ₹18,030
  - Total Due: ₹7,000 + ₹18,030 = ₹25,030

## Manual Adjustments (New Feature!)

### Why Manual Adjustments?
While auto-calculation provides accurate base amounts, you may need to adjust for:
- **Bonuses**: Extra payment for exceptional work
- **Deductions**: Penalties or advance deductions
- **Corrections**: Fixing calculation errors or special cases
- **One-time adjustments**: Special circumstances not captured by formula

### ⚠️ Important: Adjusted Amounts Carry Forward

**The adjusted amount becomes your final settlement and carries forward to next month.**

**Example:**
```
April 2026 (payable based on March 2026 data):
  Auto-calculated: ₹18,030 (3,005 SqFt sold in March × ₹6)
  You adjust to: ₹20,000 (added bonus)
  Carry forward from March: ₹100,000
  Paid: ₹0
  April Balance = ₹100,000 + ₹20,000 - ₹0 = ₹120,000

May 2026:
  Carry forward = April Balance = ₹120,000 ✅
  (Uses your adjusted ₹20,000, NOT the auto-calculated ₹18,030)
```

**Why this is correct:**
- Your adjustment represents the **final agreed obligation**
- The balance reflects **actual amounts owed**, not formulas
- Carry forward should use **real settlement amounts**, not recalculated values

**Modal shows this impact:**
When adjusting, you'll see:
```
💡 Carry Forward Impact
This amount will be used for next month's carry forward:
Balance = ₹100,000 (C/F) + ₹20,000 (Payable) - ₹0 (Paid) = ₹120,000
→ Next month's carry forward: ₹120,000
```

### How to Adjust

1. **View Auto-Calculated Amount**
   - When you open the Contractors page for March 2026 or later
   - You'll see a badge: "🤖 Auto-calculated from Sales/Line Polish data"
   - The payable amount shown is automatically calculated from **previous month's** sales/hours
   - Example: April 2026 shows payable based on March 2026 data

2. **Make an Adjustment**
   - Click **"Adjust Payable"** button
   - A modal opens showing:based on previous month (e.g., ₹18,030 from March sales)
     - **Calculation Formula**: How it was calculated (March ., ₹18,030)
     - **Calculation Formula**: How it was calculated (SqFt × ₹6)
     - **Input Field**: Pre-filled with auto-calculated amount
   - Modify the amount as needed (add bonuses, apply deductions, etc.)
   - Click **"Save Adjustment"**

3. **After Adjustment**
   - Badge changes to: "✏️ Manually adjusted (auto-calc disabled)"
   - The system will NOT overwrite your adjustment with new auto-calculated values
   - You maintain full control over the final amount

4. **Reset to Auto-Calculation**
   - If you want to go back to automatic calculation
   - Click **"🔄 Reset to Auto"** button (appears only when manually adjusted)
   - Confirm the reset**previous month's** 
   - System recalculates based on current sales/hours data
   - Badge returns to: "🤖 Auto-calculated from Sales/Line Polish data"

## Implementation Details

### When Auto-Calculation Applies
- **Start Date**: March 2026 (2026-03) and onwards
  - March 2026 payable = February 2026 sales/hours
  - April 2026 payable = March 2026 sales/hours
- **Previous Months**: February 2026 and earlier use manual "Set Payable" function
- **Reason**: Previous months' accounts are already settled; auto-calculation starts from March 2026

### Database Schema

#### New Column: `manually_adjusted`
```sql
ALTER TABLE contractor_payments 
ADD COLUMN manually_adjusted BOOLEAN DEFAULT FALSE;
```

- **FALSE**: Amount is auto-calculated (default for April 2026+)
- **TRUE**: Amount was manually adjusted (protects from auto-recalculation)

### How It Works

#### Backend Logic (Automatic)March 2026
2. **Auto-Calculate**: 
   - Queries **previous month's** sales/line polish data
   - March 2026 → looks at February 2026 data
   - April 2026 → looks at March 2026 data
   - Calculates payable amounts
   - **Only updates if `manually_adjusted = FALSE`**
3. **Manual Override**:
   - When user clicks "Save Adjustment"
   - Sets `manually_adjusted = TRUE`
   - Future auto-calculations skip this record
4. **Reset to Auto**:
   - When user clicks "Reset to Auto"
   - Sets `manually_adjusted = FALSE`
   - Next page load recalculates amount from previous month's data
   - Next page load recalculates amount

#### Frontend UI States

**State 1: Auto-Calculated (Not Adjusted)**
```
🤖 Auto-calculated from Sales data
[Adjust Payable]
```

**State 2: Manually Adjusted**
```
✏️ Manually adjusted (auto-calc disabled)
[Adjust PayableMarch Reset to Auto]
```

**State 3: Pre-April 2026**
```
[Set Payable]
```

### Adjustment Modal Features

When you click "Adjust Payable" for an auto-calculated month:

```
┌─────────────────────────────────────┐
│ Adjust Payable - Contractor Dinesh │
├─────────────────────────────────────┤
│ 🤖 Auto-Calculated Amount          │
│     ₹18,030                         │
│     SqFt sold × ₹6                  │
│                                     │
│ You can adjust this amount below    │
│ to add bonuses, deductions, or      │
│ corrections.                        │
├─────────────────────────────────────┤
│ Adjusted Payable for April 2026 *   │
│ [18030.00]                          │
│ Modify the auto-calculated amount   │
│ if adjustments are needed           │
├─────────────────────────────────────┤
│ [Save Adjustment] [Cancel]          │
└─────────────────────────────────────┘
```

## Real-time Updates vs Manual Control

### Scenario 1: Pure Auto-Calculation
1. April 2026: 3,005 SqFt sold → Payable = ₹18,030
2. Add new sale: 100 SqFt
3. Refresh page
4. **Result**: Payable updates to ₹18,630 (3,105 × 6)

### Scenario 2: With Manual Adjustment
1. April 2026: 3,005 SqFt sold → Payable = ₹18,030 (auto)
2. You adjust to ₹20,000 (added ₹1,970 bonus)
3. Add new sale: 100 SqFt
4. Refresh page
5. **Result**: Payable stays at ₹20,000 (protected from auto-update)

### Scenario 3: Reset to Auto
1. Continuing from Scenario 2...
2. Click "Reset to Auto"
3. Refresh page
4. **Result**: Payable updates to ₹18,630 (3,105 × 6) - recalculated

## Use Cases

### Use Case 1: Bonus Payment
**Situation**: Dinesh completed a rushed order exceptionally well
```
Auto-calculated: ₹18,030
Adjustment: +₹2,000 bonus
Final: ₹20,030
```

### Use Case 2: Deduction
**Situation**: LinePolish took 2 days off
```
Auto-calculated: ₹10,000
Adjustment: -₹2,000 (8 hours @ ₹250)
Final: ₹8,000
```

### Use Case 3: Correction
**Situation**: Some sales shouldn't count toward Dinesh's commission
```
Auto-calculated: ₹18,030
Adjustment: Manually recalculate excluding special orders
Final: ₹15,000
```

## Files Modified

### Backend
- `/app/api/contractor-payments/route.ts` - Auto-calculation with manual override protection
- `/app/api/contractor-payments/payable/route.ts` - Sets `manually_adjusted = true` on save
- `/app/api/contractor-payments/reset-auto/route.ts` - New endpoint to reset to auto-calculation

### Frontend  
- `/app/contractors/page.tsx` - UI with adjustment modal, reset button, and status indicators

### Database
- `/migrations/add_manually_adjusted_flag_to_contractor_payments.sql` - New column

## API Endpoints

### POST `/api/contractor-payments/payable`
**Purpose**: Set/adjust payable amount manually
**Sets**: `manually_adjusted = true`

### POST `/api/contractor-payments/reset-auto`
**Purpose**: Reset to auto-calculation mode
**Sets**: `manually_adjusted = false`

### GET `/api/contractor-payments?month=YYYY-MM`
**Purpose**: Fetch contractor data
**Behavior**: Auto-calculates only if `manually_adjusted = false`

## Testing Scenarios

### Test 1: Basic Auto-Calculation
1. Go to April 2026
2. **Expected**: Shows auto-calculated amounts with "🤖" badge

### Test 2: Manual Adjustment
1. Click "Adjust Payable"
2. Change amount from ₹18,030 to ₹20,000
3. Save
4. **Expected**: Badge changes to "✏️ Manually adjusted"
5. **Expected**: "Reset to Auto" button appears

### Test 3: Protected from Auto-Update
1. After manual adjustment (₹20,000)
2. Add new sales (increase SqFt)
3. Refresh page
4. **Expected**: Amount stays at ₹20,000 (not recalculated)

### Test 4: Reset to Auto
1. Click "Reset to Auto"
2. Confirm
3. **Expected**: Amount recalculates based on current sales/hours
4. **Expected**: Badge returns to "🤖 Auto-calculated"

### Test 5: Pre-April 2026
1. Select March 2026
2. **Expected**: Shows "Set Payable" button (not "Adjust")
3. **Expected**: No auto-calculation badges

## Benefits

1. **Flexibility**: Auto-calculate by default, adjust when needed
2. **Accuracy**: Base calculations always correct, with room for exceptions
3. **Control**: You decide when to use auto vs manual amounts
4. **Transparency**: Clear indicators show calculation source
5. **Reversible**: Easy to reset back to auto-calculation
6. **Historical Integrity**: Pre-April 2026 months remain manually controlled
