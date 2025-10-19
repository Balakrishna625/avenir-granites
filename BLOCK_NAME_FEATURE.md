# Line Polish Report - Block Name Feature

## Summary
Added a "Block Name" text field to the Line Polish Report form to track which granite block is being processed for each activity.

## Changes Made

### 1. TypeScript Interface Updates
- **ActivityRow Interface**: Added `block_name: string` field
- **LinePolishReport Interface**: Updated activities array to include optional `block_name?: string`

### 2. Form Updates
- Added "Block Name" column as the first column in the activity table (before "Activity Type")
- New text input field with placeholder "e.g., AVG-1A"
- Block name is optional (not required)

### 3. Data Flow
- **Initial form data**: Includes empty `block_name` field
- **Add activity row**: New rows include empty `block_name` 
- **Form submission**: Block name is included in the activities JSONB array sent to API
- **Edit functionality**: Block name is populated when editing existing reports

### 4. Database
- **No migration required!** The `activities` column is already JSONB (schema-less)
- JSONB automatically supports the new `block_name` field
- Created documentation migration: `migrations/add_block_name_to_line_polish_activities.sql`
- Updated column comments to document the new field structure

### 5. Example Data Structure
```json
{
  "activities": [
    {
      "block_name": "AVG-1A",
      "activity": "S/G Polishing",
      "slabs": 14,
      "sqft": 1234.5
    },
    {
      "block_name": "AVG-2B", 
      "activity": "B/P Grinding",
      "slabs": 23,
      "sqft": 3456.0
    }
  ]
}
```

## Table Layout (Updated)
1. **Block Name** - Text input (optional)
2. **Activity Type** - Dropdown (required)
3. **Slabs** - Number input
4. **Sq Ft** - Number input  
5. **Action** - Delete button

## Backward Compatibility
- Existing records without `block_name` will continue to work
- The field is optional, so not filling it won't cause errors
- The `act.block_name || ''` fallback ensures empty string if field is missing
