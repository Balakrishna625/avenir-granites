# Unsaved Changes Warning System

## Overview
This system prevents data loss by warning users when they try to navigate away from a page with unsaved form changes.

## How It Works

The system provides two custom React hooks:

### 1. `useUnsavedChangesWarning(hasUnsavedChanges, message?)`
Warns users before navigating away with unsaved changes.

**Parameters:**
- `hasUnsavedChanges` (boolean): Indicates if there are unsaved changes
- `message` (string, optional): Custom warning message. Default: "You have unsaved changes. Are you sure you want to leave?"

**Returns:**
- `{ allowNavigation }`: Function to call after successful save to allow navigation without warning

**Protects Against:**
- ✅ Browser back/forward button
- ✅ Browser refresh (F5)
- ✅ Closing tab/window
- ✅ Next.js `<Link>` navigation
- ✅ `router.push()` calls
- ✅ `router.back()` calls

### 2. `useFormChanges(initialData, currentData)`
Helper hook to detect form changes by comparing initial and current data.

**Parameters:**
- `initialData`: The initial/saved form state
- `currentData`: The current form state

**Returns:**
- `boolean`: `true` if data has changed, `false` otherwise

## Usage Examples

### Basic Form Protection

```tsx
'use client';

import { useState } from 'react';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

export default function MyFormPage() {
  const initialData = { name: '', email: '' };
  const [formData, setFormData] = useState(initialData);
  
  // Detect changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
  
  // Protect the form
  const { allowNavigation } = useUnsavedChangesWarning(hasChanges);
  
  const handleSave = async () => {
    await saveData(formData);
    allowNavigation(); // Allow navigation after save
    router.push('/success');
  };
  
  return (
    <form onSubmit={handleSave}>
      {/* Your form fields */}
    </form>
  );
}
```

### With Initial Data Tracking

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

export default function EditPage() {
  const [formData, setFormData] = useState({});
  const [initialFormData, setInitialFormData] = useState({});
  
  useEffect(() => {
    // Load data
    const data = await fetchData();
    setFormData(data);
    setInitialFormData(data); // Save as initial state
  }, []);
  
  // Check for changes
  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const { allowNavigation } = useUnsavedChangesWarning(hasUnsavedChanges);
  
  const handleSubmit = async () => {
    await updateData(formData);
    allowNavigation();
    router.push('/list');
  };
  
  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
}
```

### Modal/Dialog with Close Button

```tsx
export function AddExpenseForm({ onClose, onSuccess }) {
  const initialFormData = { amount: '', description: '' };
  const [formData, setFormData] = useState(initialFormData);
  
  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const { allowNavigation } = useUnsavedChangesWarning(hasUnsavedChanges);
  
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        allowNavigation();
        onClose();
      }
    } else {
      onClose();
    }
  };
  
  const handleSubmit = async () => {
    await saveExpense(formData);
    allowNavigation(); // Important: Allow navigation before closing
    onSuccess();
    onClose();
  };
  
  return (
    <div>
      <button onClick={handleClose}>Close</button>
      {/* form fields */}
    </div>
  );
}
```

### With Custom Warning Message

```tsx
const { allowNavigation } = useUnsavedChangesWarning(
  hasChanges,
  'You have unsaved expense data. Closing will lose this information. Continue?'
);
```

### Using the Helper Hook

```tsx
import { useFormChanges, useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

const initialData = { name: '', amount: 0 };
const [formData, setFormData] = useState(initialData);

// Simplified change detection
const hasChanges = useFormChanges(initialData, formData);
useUnsavedChangesWarning(hasChanges);
```

## Implementation Checklist

When adding to a new form page:

1. ✅ Import the hook
2. ✅ Track initial form state
3. ✅ Detect changes (compare current vs initial)
4. ✅ Call `useUnsavedChangesWarning(hasChanges)`
5. ✅ Call `allowNavigation()` after successful save
6. ✅ Test navigation scenarios (back button, links, close buttons)

## Already Implemented On

- ✅ `/consignments/new` - New consignment form
- ✅ `AddExpenseForm` component - Expense entry modal

## Where to Add Next

Consider adding to:
- `/consignments/[id]` - Edit consignment page
- `/consignments/calculator` - Consignment calculator
- `/consignments/slab-processing` - Slab processing form
- Any other pages with data entry forms

## Important Notes

⚠️ **Always call `allowNavigation()` before navigation after save**

```tsx
// ❌ WRONG - Will still show warning
const handleSave = async () => {
  await saveData();
  router.push('/success'); // Warning will show!
};

// ✅ CORRECT - Navigation allowed
const handleSave = async () => {
  await saveData();
  allowNavigation(); // Tell the hook save is complete
  router.push('/success'); // No warning
};
```

⚠️ **The hook tracks changes by JSON comparison**

Complex objects with functions or Date objects may need custom comparison logic.

⚠️ **Browser beforeunload is limited**

Modern browsers show a generic message for `beforeunload` events (refresh/close tab). Custom messages only work for in-app navigation (router.push, etc.).

## Technical Details

### How It Detects Changes

```tsx
const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
```

For simple forms, JSON comparison works well. For complex forms with nested objects, dates, or files, you may need:

```tsx
// Custom comparison
const hasChanges = useMemo(() => {
  return (
    formData.name !== initialData.name ||
    formData.amount !== initialData.amount ||
    formData.date.getTime() !== initialData.date.getTime()
  );
}, [formData, initialData]);
```

### Navigation Prevention Methods

1. **Browser events**: Uses `beforeunload` event
2. **Next.js router**: Temporarily wraps `router.push` and `router.back` to show confirmation
3. **Link clicks**: Intercepted via router wrapping

## Troubleshooting

**Q: Warning shows even after saving**
- Make sure you call `allowNavigation()` after successful save

**Q: Warning doesn't show on browser back button**
- Check that `hasUnsavedChanges` is correctly detecting changes
- Verify the hook is being called with `true` value

**Q: Warning appears immediately on page load**
- Ensure `initialFormData` is set correctly
- Don't update `formData` without also updating `initialFormData` during initialization

**Q: Custom message doesn't show for browser refresh**
- This is a browser security limitation. Custom messages only work for in-app navigation.

## Performance Considerations

The hook uses JSON.stringify for comparison, which is fine for most forms but may impact performance on very large forms (1000+ fields). For such cases, use custom comparison logic.

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

All modern browsers support the `beforeunload` event and confirmation dialogs.

## Pages Protected with Unsaved Changes Warning

The following pages have implemented the unsaved changes warning system:

1. ✅ **Consignment New Page** (`/app/consignments/new/page.tsx`)
   - Protects: Consignment details, customer info, items
   - Documentation: Inline implementation

2. ✅ **Add Expense Form** (`/components/AddExpenseForm.tsx`)
   - Protects: Modal expense entry form
   - Special: Close button with confirmation dialog
   - Documentation: Inline implementation

3. ✅ **Multi-Cutter Report** (`/app/production/multi-cutter/page.tsx`)
   - Protects: 3-machine report with dynamic block rows
   - Complex: Multiple sections, dynamic content
   - Documentation: `/docs/MULTI_CUTTER_UNSAVED_CHANGES.md`

4. ✅ **Line Polish Report** (`/app/production/line-polish/page.tsx`)
   - Protects: Shift details, multiple activity rows
   - Complex: Multiple activity types, dynamic rows
   - Documentation: `/docs/LINE_POLISH_UNSAVED_CHANGES.md`

### Implementation Pattern

All protected pages follow the same pattern:
- Import hooks and components
- Track initial vs current form state
- Add `useUnsavedChangesWarning` hook
- Call `allowNavigation()` after successful save
- Add visual indicator banner
- Protect Cancel/Close buttons with confirmation

For detailed implementation examples, see the individual page documentation files listed above.
