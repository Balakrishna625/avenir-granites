# Table Sorting Implementation Guide

## ✅ Components Created

### 1. `/hooks/useTableSort.ts`
- Custom React hook for table sorting
- Handles asc/desc/null sorting states
- Supports numbers, strings, dates, and null values
- Usage: `const { sortedData, sortConfig, requestSort } = useTableSort(data);`

### 2. `/components/ui/SortButton.tsx`
- Reusable sort button component with icons
- Shows arrow icons for sort direction (up/down/both)
- Highlights active sort column
- Usage: `<SortButton column="date" sortConfig={sortConfig} onSort={requestSort} label="Date" align="left" />`

## 📋 Tables That Need Sorting

### Production Module

#### 1. **Multi-Cutter Data Table** (`/app/production/multi-cutter/page.tsx`)
- **Location**: Lines 1054-1147 (Single Machine View)
- **Columns**: Date, Block Name, Material, Slabs, Sq Ft, Notes
- **Implementation Steps**:
  1. Flatten data structure (reports with blocks)
  2. Add `useTableSort` hook
  3. Replace table headers with `SortButton` components
  4. Use `sortedData` instead of raw data
  
#### 2. **Multi-Cutter Analytics - Material Breakdown** (`/app/production/multi-cutter-analytics/page.tsx`)
- **Location**: Lines 636-670
- **Columns**: Material Type, Blocks, Total Slabs, Total SqFt, % of Total, Avg Sqft/Block
- **Data Source**: `materialBreakdown` array

#### 3. **Multi-Cutter Analytics - Top Blocks** (`/app/production/multi-cutter-analytics/page.tsx`)
- **Location**: Lines 686-730
- **Columns**: Rank, Block Name, Material, Times Processed, Total Slabs, Total Sqft, Avg Sqft/Cut
- **Data Source**: `topBlocks` array

#### 4. **Line Polish Reports Table** (`/app/production/line-polish/page.tsx`)
- **Location**: Lines 1378-1440
- **Columns**: Date, Shift, Activity, Workers, Hours, Slabs, Sq Ft, Debit, Credit, Balance
- **Data Source**: `filterReportsByMonth(reports)` array
- **Challenge**: Complex filtering logic, needs careful integration

#### 5. **Line Polish - Monthly Breakdown** (`/app/production/line-polish/page.tsx`)
- **Location**: Lines 1464-1510
- **Columns**: Month, Hours, Slabs, Sq Ft, Debit, Credit, Balance
- **Data Source**: Calculated `monthlyBreakdown` array

#### 6. **Line Polish - Payments Table** (`/app/production/line-polish/page.tsx`)
- **Location**: Lines 1520-1560
- **Columns**: Date, Amount, Payment Mode, Notes
- **Data Source**: `filterPaymentsByMonth(payments)` array

#### 7. **Line Polish - Activity Summary** (`/app/production/line-polish/page.tsx`)
- **Location**: Lines 1694-1720
- **Columns**: Activity, Entries, Workers, Slabs, Total Sqft, Avg Sqft
- **Data Source**: Calculated `activitySummary` object

### Consignment Module

#### 8. **Consignments Table** (`/app/consignments/page.tsx`)
- **Location**: Lines 252-290
- **Columns**: Date, Customer, Total, RTGS Expected, Cash Expected, Paid, Balance
- **Data Source**: `consignments` array

#### 9. **Consignment Details - Transactions** (`/app/consignments/[id]/page.tsx`)
- **Location**: Lines 353-400
- **Columns**: Date, Mode, Amount, Bank, Notes
- **Data Source**: `transactions` array

#### 10. **Slab Processing Table** (`/app/consignments/slab-processing/page.tsx`)
- **Location**: Lines 438-490
- **Columns**: Date, Consignment, Block, Input Slabs, Polished, Rejected, Rate, Amount
- **Data Source**: `slabProcessingRecords` array

### Customer/Transaction Module

#### 11. **Transactions Table - Pending** (`/components/TransactionsTable.tsx`)
- **Location**: Lines 210-270
- **Columns**: Date, Customer, Mode, Amount, Bank, Notes
- **Data Source**: `pendingTransactions` array

#### 12. **Transactions Table - Completed** (`/components/TransactionsTable.tsx`)
- **Location**: Lines 348-410
- **Columns**: Date, Customer, Mode, Amount, Bank, Notes
- **Data Source**: `completedTransactions` array

### Expense Module

#### 13. **Expenses Table** (`/app/expenses/page.tsx`)
- **Location**: Lines 296-350
- **Columns**: Date, Category, Amount, Account, Vendor, Description
- **Data Source**: `expenses` array

## 🚀 Implementation Pattern

### Step-by-Step for Each Table:

```typescript
// 1. Import the hooks at the top
import { useTableSort } from '@/hooks/useTableSort';
import { SortButton } from '@/components/ui/SortButton';

// 2. Add sorting hook in component
const { sortedData, sortConfig, requestSort } = useTableSort(dataArray);

// 3. Replace table headers
// BEFORE:
<th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>

// AFTER:
<th className="py-3 px-4">
  <SortButton 
    column="date" 
    sortConfig={sortConfig} 
    onSort={requestSort} 
    label="Date" 
    align="left"
  />
</th>

// 4. Use sorted data in tbody
// BEFORE:
{dataArray.map(item => ...)}

// AFTER:
{sortedData.map(item => ...)}
```

## ⚠️ Special Considerations

### Complex Data Structures
- **Multi-Cutter**: Data is nested (reports → blocks). Need to flatten before sorting.
- **Line Polish**: Multiple filters applied. Sort after filtering.
- **Date Totals**: Preserve date grouping totals when sorting.

### Nested Data Example (Multi-Cutter):
```typescript
// Flatten reports with blocks for sorting
const flattenedData = reports.flatMap(report => 
  report.blocks.map(block => ({
    ...block,
    date: report.date,
    reportId: report.id
  }))
);

const { sortedData, sortConfig, requestSort } = useTableSort(flattenedData);
```

## 🎯 Priority Order

1. **High Priority** (Most frequently used):
   - Multi-Cutter Data Table ✓
   - Line Polish Reports Table
   - Consignments Table
   - Transactions Tables

2. **Medium Priority**:
   - Multi-Cutter Analytics tables
   - Line Polish breakdown tables
   - Expenses Table

3. **Low Priority**:
   - Slab Processing
   - Individual consignment transactions

## 📝 Testing Checklist

For each table after implementation:
- [ ] Clicking header sorts ascending
- [ ] Clicking again sorts descending  
- [ ] Clicking third time resets to original order
- [ ] Active sort column is highlighted
- [ ] Arrow icons update correctly
- [ ] Existing filters still work
- [ ] Date totals/grouping preserved (where applicable)
- [ ] Edit/Delete actions still work
- [ ] No console errors
- [ ] Performance is acceptable with large datasets

## 🔧 Common Issues & Solutions

### Issue 1: TypeScript errors with column keys
**Solution**: Define proper interface for flattened data

### Issue 2: Sorting breaks with nested objects
**Solution**: Flatten data before sorting

### Issue 3: Date sorting doesn't work
**Solution**: Ensure dates are in ISO format (YYYY-MM-DD)

### Issue 4: Numbers sort as strings
**Solution**: Hook handles this automatically if data type is number

## 📦 Files Modified

- ✅ `/hooks/useTableSort.ts` (Created)
- ✅ `/components/ui/SortButton.tsx` (Created)
- 🔄 `/app/production/multi-cutter/page.tsx` (Started)
- ⏳ 12 more table components...

## 🎉 Benefits

1. **Consistent UX**: Same sorting behavior across all tables
2. **Reusable**: One hook, one component for all tables
3. **Accessible**: Keyboard navigable, visual feedback
4. **Performant**: Memoized sorting, only re-sorts when needed
5. **Flexible**: Supports any data type, custom comparisons possible

## 📞 Next Steps

Due to the large scope (13 tables), I recommend:

1. **Option A**: Implement high-priority tables first, test, then continue
2. **Option B**: I can provide specific code snippets for each table
3. **Option C**: Implement one complete example (Multi-Cutter) and you can replicate the pattern

Would you like me to:
- Complete Multi-Cutter Data table as a working example?
- Implement specific high-priority tables?
- Continue with all tables systematically?
