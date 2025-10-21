# Fix: Multi-Cutter Analytics React Hooks Error

## Problem
When clicking on "Multi Cutter Analytics", the page was throwing this error:
```
Error: Minified React error #310
```

This is React's "Rendered more hooks than during the previous render" error.

## Root Cause

The `useTableSort` hooks were being called **AFTER** an early return statement:

```tsx
// ❌ WRONG - Hooks called conditionally
export default function MultiCutterAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadAnalytics();
  }, []);

  // Early return BEFORE hooks
  if (loading) {
    return <div>Loading...</div>;
  }

  // These hooks are only called when NOT loading!
  const { sortedData } = useTableSort(data); // ❌ Error!
}
```

### Why This Breaks

React's Rules of Hooks state:
1. **Always call hooks at the top level** - never in loops, conditions, or nested functions
2. **Hooks must be called in the same order** every render

When `loading=true`:
- Only `useState` and `useEffect` are called
- Component returns early

When `loading=false`:
- `useState`, `useEffect`, **AND** `useTableSort` are called
- Different number of hooks = React error #310

## Solution

Move all hooks (including data extraction) **BEFORE** the early return:

```tsx
// ✅ CORRECT - All hooks called before any returns
export default function MultiCutterAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  
  // Extract data (safe with empty defaults)
  const materialBreakdown = analytics?.material_breakdown || [];
  const topBlocks = analytics?.top_blocks || [];
  
  // Call hooks unconditionally
  const { sortedData: sortedMaterialBreakdown } = useTableSort(materialBreakdown);
  const { sortedData: sortedTopBlocks } = useTableSort(topBlocks);
  
  useEffect(() => {
    loadAnalytics();
  }, []);
  
  // NOW it's safe to return early
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Rest of component...
}
```

## Files Changed

- ✅ `app/production/multi-cutter-analytics/page.tsx` - Fixed
- ✅ `app/production/multi-cutter/page.tsx` - Already correct (hooks before early return)
- ✅ `app/production/multi-cutter-debug/page.tsx` - No hooks issue (no sorting hooks used)

## Key Takeaways

### ✅ DO:
- Call all hooks at the top of your component
- Use empty arrays/objects as defaults for hook inputs
- Return early AFTER all hooks are called

### ❌ DON'T:
- Call hooks after conditional returns
- Call hooks inside if statements
- Call hooks inside loops
- Change the number of hooks between renders

## Testing

After the fix:
1. Navigate to Multi-Cutter Analytics
2. Page should load without errors
3. Sorting on Material Breakdown table should work
4. Sorting on Top Blocks table should work

## Related Documentation

- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React Error #310](https://react.dev/errors/310)
