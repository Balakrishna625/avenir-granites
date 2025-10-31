# Consignment Details Feature

## Overview
The Consignment Details feature allows you to track granite block purchases from various quarries. This feature helps manage consignment records, blocks, and associated costs.

## Database Schema Updates

### New/Updated Columns in `granite_consignments`:
- `quarry_name` - Name of the quarry (restricted to: Sai lakshmi, Sambrajyam, Burgandy, Gokanakonda, Ummadivaram)
- `purchase_date` - Date when the consignment was purchased
- `total_blocks_count` - Total number of blocks in the consignment
- `purchase_cost` - Cost of purchasing the blocks
- `loading_cost` - Cost for loading the consignment
- `quarry_commission` - Commission paid to the quarry
- `other_charges` - Other miscellaneous charges
- `total_expenditure` - Auto-calculated as sum of all costs (purchase + transport + loading + commission + other)

## Setup Instructions

### 1. Run the Database Migration
Execute the migration script to update your database schema:

```bash
# Connect to your Supabase database using the SQL Editor or psql
# Then run the migration file:
migrations/update_consignment_schema_for_new_design.sql
```

### 2. Verify Migration
After running the migration, verify that:
- All quarry suppliers exist in `granite_suppliers` table
- New columns are added to `granite_consignments` table
- Indexes are created

## Feature Usage

### Accessing the Feature
Navigate to **Consignment Management > Consignment Details** in the sidebar.

### Dashboard Statistics
The page displays key metrics in tiles:
- **Total Consignments** - Number of consignments in the selected period
- **Total Money Spent** - Sum of all expenditures
- **Total Blocks** - Total number of blocks purchased
- **Net Measurement** - Total net measurement across all blocks

### Adding a Consignment

1. Click **"Add Consignment"** button
2. Fill in the form:
   - **Purchase Date**: Select the date
   - **Quarry Name**: Choose from dropdown (Sai lakshmi, Sambrajyam, Burgandy, Gokanakonda, Ummadivaram)
   - **Cost Details**: Enter purchase cost, transport cost, loading cost, quarry commission, other charges
   - **Block Details**: Add multiple blocks with:
     - Block Name (format: AVG-1, AVG-2, etc.)
     - Net Measurement (in meters)
     - Gross Measurement (in meters)

3. Total measurements are auto-calculated from block entries
4. Click **"Save Consignment"** to create the record

### Filtering Consignments
Use the filter controls to view specific consignments:
- **Month**: Select month
- **Year**: Select year
- **Quarry**: Filter by specific quarry or view all

### Viewing Consignments
The consignments table displays:
- Consignment Number (format: CSG-YYYYMMDD-XXX)
- Purchase Date
- Quarry Name
- Number of Blocks
- Net and Gross Measurements
- Total Cost

## API Endpoints

### GET `/api/consignments-new`
Fetch consignments with optional filters:
- `month` - Filter by month (1-12)
- `year` - Filter by year
- `quarry` - Filter by quarry name

### POST `/api/consignments-new`
Create a new consignment with blocks.

**Request Body:**
```json
{
  "purchase_date": "2025-10-31",
  "quarry_name": "Sai lakshmi",
  "purchase_cost": 500000,
  "transport_cost": 50000,
  "loading_cost": 10000,
  "quarry_commission": 5000,
  "other_charges": 2000,
  "blocks": [
    {
      "block_name": "AVG-1",
      "net_measurement": 1.5,
      "gross_measurement": 1.8
    }
  ]
}
```

### GET `/api/consignments-new/stats`
Get statistics for consignments:
- `month` - Filter by month
- `year` - Filter by year

**Response:**
```json
{
  "totalConsignments": 10,
  "totalMoneySpent": 5000000,
  "totalBlocks": 50,
  "totalNetMeasurement": 75.5,
  "totalGrossMeasurement": 90.2,
  "quarryBreakdown": [...]
}
```

## Files Created/Modified

### New Files:
1. `/migrations/update_consignment_schema_for_new_design.sql` - Database migration
2. `/app/consignments/details/page.tsx` - Main UI page
3. `/app/api/consignments-new/route.ts` - CRUD API
4. `/app/api/consignments-new/stats/route.ts` - Statistics API

### Modified Files:
1. `/components/Sidebar.tsx` - Added navigation menu item

## Important Notes

### Block Naming Convention
- All block names must start with "AVG-"
- Block names are automatically converted to uppercase
- Example: AVG-1, AVG-2A, AVG-3B

### Cost Calculation
Total Expenditure is automatically calculated as:
```
Total Expenditure = Purchase Cost + Transport Cost + Loading Cost + 
                    Quarry Commission + Other Charges
```

### Data Integrity
- Quarry names are restricted to the 5 predefined quarries
- Blocks are linked to consignments via foreign key
- Deleting a consignment will automatically delete associated blocks (CASCADE)

## Future Enhancements (Not Implemented Yet)
The following features are planned for future development:
- Link multi-cutter production data to consignments
- Track total slabs and sqft produced per consignment
- Production efficiency tracking per consignment
- Block-to-production mapping

## Troubleshooting

### Issue: Quarry dropdown is empty
**Solution**: Run the migration script to insert quarry suppliers

### Issue: Total expenditure not calculating
**Solution**: Ensure the `total_expenditure` column was recreated as a generated column

### Issue: Can't save consignment
**Solution**: 
- Check that quarry name is selected
- Ensure at least one block is added with all measurements
- Verify block names are not duplicate

## Support
For issues or questions, refer to the migration logs or check the browser console for error messages.
