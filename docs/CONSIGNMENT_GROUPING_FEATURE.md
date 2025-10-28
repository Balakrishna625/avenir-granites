# Consignment Grouping Feature

## Overview
The Consignment Grouping feature allows you to organize multiple related consignments into logical groups for combined tracking and analysis.

## Setup Steps

### 1. Run Database Migration
Execute the following SQL file in Supabase SQL Editor:
```
migrations/create_consignment_groups.sql
```

This will create:
- `consignment_groups` table - Stores group information
- `consignment_group_members` table - Links consignments to groups
- `consignment_groups_summary` view - Aggregated production data for groups

### 2. Database Schema

**consignment_groups:**
- `id` - UUID (primary key)
- `group_name` - Unique name for the group
- `description` - Optional description
- `created_at` - Timestamp
- `updated_at` - Timestamp

**consignment_group_members:**
- `id` - UUID (primary key)
- `group_id` - Reference to consignment_groups
- `consignment_id` - Reference to granite_consignments
- `added_at` - Timestamp
- Unique constraint on (group_id, consignment_id)

### 3. Key Features

#### Consignment Grouping Page (`/consignments/grouping`)
- **Create New Group**: Organize consignments by name (e.g., "AVG Group 1", "January Batch")
- **Add to Existing Group**: Add more consignments to an existing group
- **Remove from Group**: Remove consignments without deleting them
- **Delete Group**: Delete the group (consignments remain intact)
- **Smart Selection**: Only shows consignments not already in other groups

#### Consignment Summaries Page (`/consignments/summaries`)
- Shows production summaries for individual consignments
- Month-based filtering
- Expandable details showing block-level production
- Separate tracking for multi-cutter and line-polish stages

## How It Works

### Example Use Case
If you have three related consignments: **AVG-1**, **AVG-2**, and **AVG-3**

1. Go to **Consignments → Consignment Grouping**
2. Click **"New Group"**
3. Enter group name: `"AVG Group 1"`
4. Select AVG-1, AVG-2, AVG-3 from the list
5. Click **"Create Group"**

### Result
- All three consignments are now grouped together
- You can view combined production stats in the summaries
- Individual consignments remain independent
- You can add/remove consignments from the group later

## Navigation

**Sidebar Menu:**
- Consignment Management
  - Consignment Calculator
  - All Consignments
  - **Consignment Summaries** ← Production tracking
  - **Consignment Grouping** ← NEW: Organize consignments
  - Slab Processing

**Note:** "New Consignment" menu item has been replaced with "Consignment Grouping"

## API Endpoints

### Get All Groups
```
GET /api/consignment-groups
```
Returns all groups with their consignments and aggregated production data

### Create Group
```
POST /api/consignment-groups
Body: {
  "group_name": "AVG Group 1",
  "description": "Q1 2025 Batch",
  "consignment_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Delete Group
```
DELETE /api/consignment-groups/{groupId}
```
Deletes the group (consignments remain)

### Add Consignments to Group
```
POST /api/consignment-groups/{groupId}/members
Body: {
  "consignment_ids": ["uuid4", "uuid5"]
}
```

### Remove Consignment from Group
```
DELETE /api/consignment-groups/{groupId}/members/{consignmentId}
```

## Production Summary Integration

Once groups are created and the production views are set up:

1. Multi-cutter reports with `block_name` field (e.g., AVG-1A, AVG-2B)
2. Line-polish reports with `block_name` field
3. System automatically aggregates production data
4. View combined stats in Consignment Summaries page
5. Group view shows totals across all consignments in the group

## Color Coding

- 🟠 **Orange** - Multi-Cutter stage (cutting)
- 🟣 **Purple** - Line-Polish stage (polishing)
- 🟢 **Green** - Final product / high efficiency (≥95%)
- 🔵 **Blue** - Good efficiency (≥85%)
- 🟡 **Amber** - Fair efficiency (≥75%)
- 🔴 **Red** - Low efficiency (<75%)

## Benefits

1. **Logical Organization**: Group related consignments together
2. **Combined Tracking**: See total production across multiple consignments
3. **Flexible Management**: Add/remove consignments as needed
4. **Preserved Independence**: Individual consignments remain accessible
5. **Historical Analysis**: Track production efficiency across batches
6. **No Data Loss**: Deleting groups doesn't affect consignments

## Notes

- Each consignment can only belong to one group at a time
- Groups can be created, modified, and deleted without affecting consignments
- Production data remains linked to individual consignments
- Summaries aggregate data from all consignments in a group
- Empty groups (no consignments) can exist but won't show in production summaries
