# Contractor Previous Month Payment Update

## Summary
Updated the contractor payment system to use **previous month's sales/hours** for calculating payables, ensuring contractors are paid based on their prior month's work.

## Payment Timeline (NEW Logic)

### Timeline Flow
- **February 2026 sales/hours** → **Paid in March 2026**
- **March 2026 sales/hours** → **Paid in April 2026**
- **April 2026 sales/hours** → **Paid in May 2026**

### Example
```
February 2026:
  - Dinesh sold 2,500 SqFt
  - LinePolish worked 35 hours

March 2026:
  - Dinesh Payable = 2,500 SqFt × ₹6 = ₹15,000 (Feb sales)
  - LinePolish Payable = 35 hours × ₹250 = ₹8,750 (Feb hours)

April 2026:
  - Dinesh sold 3,005 SqFt in March
  - LinePolish worked 40 hours in March
  - Dinesh Payable = 3,005 × ₹6 = ₹18,030 (March sales)
  - LinePolish Payable = 40 × ₹250 = ₹10,000 (March hours)
  - Plus any carry forward balance from March
```

## What Changed

### 1. Auto-Calculation Logic
- **Before**: Used current month's sales/hours
- **After**: Uses **previous month's** sales/hours

### 2. Calculation Functions
Updated in both API files:
- `/app/api/contractor-payments/route.ts`
- `/app/api/contractor-payments/calculate-payable/route.ts`

#### Contractor Dinesh
```typescript
// Now looks at PREVIOUS month's sales
const prevMonth = calculatePreviousMonth(currentMonth);
const sales = await getSalesForMonth(prevMonth);
const payable = totalSqFt(sales) × ₹6;
```

#### Contractor LinePolish
```typescript
// Now looks at PREVIOUS month's hours
const prevMonth = calculatePreviousMonth(currentMonth);
const reports = await getLinePolishReportsForMonth(prevMonth);
const payable = totalHours(reports) × ₹250;
```

### 3. UI Updates
**Contractor Payments Page** (`/app/contractors/page.tsx`):
- Now displays which month's data is being used
- Shows "Based on [Previous Month] data" in modal
- Updated calculation display to show source month
- Example: "🔹 Feb 2026: 2,500 SqFt × ₹6"

### 4. Documentation Updates
Updated `/docs/CONTRACTOR_AUTO_PAYABLE_CALCULATION.md`:
- Added payment timeline section
- Updated examples to show previous month logic
- Clarified that March 2026 uses February 2026 data
- Updated all descriptions and help text

## Carry Forward Logic (Unchanged)
The carry forward logic remains the same:
```
April 2026 Balance = March Balance (C/F) + April Payable (based on March work) - April Payments
May 2026 Carry Forward = April 2026 Balance
```

## Manual Adjustments (Unchanged)
- You can still manually adjust amounts
- Adjusted amounts are used for carry forward
- Reset to auto-calculation recalculates from previous month's data

## Migration Notes
- **No database changes required**
- **No data migration needed**
- Existing records are unaffected
- New calculations apply automatically from March 2026 onwards

## Testing Checklist
- [x] Updated calculation functions to use previous month
- [x] Updated UI to show source month
- [x] Updated documentation
- [x] No TypeScript errors
- [ ] Test March 2026 payable (should use Feb 2026 data)
- [ ] Test April 2026 payable (should use March 2026 data)
- [ ] Verify carry forward still works correctly
- [ ] Check manual adjustment still works

## Files Modified
1. `/app/api/contractor-payments/route.ts` - Main auto-calculation logic
2. `/app/api/contractor-payments/calculate-payable/route.ts` - POST endpoint for calculations
3. `/app/contractors/page.tsx` - UI updates to show previous month context
4. `/docs/CONTRACTOR_AUTO_PAYABLE_CALCULATION.md` - Documentation updates

## Date: April 17, 2026
**Implementation Complete** ✅
