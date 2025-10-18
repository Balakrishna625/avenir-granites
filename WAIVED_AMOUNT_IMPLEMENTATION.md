# Waived Amount Tracking - Implementation Summary

## Overview
Implemented a comprehensive waived amount tracking system that stores historical records with dates and optional notes for each waived/purged amount from customer bills.

## Database Changes

### New Table: `waived_transactions`
```sql
CREATE TABLE waived_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  waived_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Track each instance when an amount is waived from a customer's bill, with full history.

### Removed Column
- Removed `waived_amount` column from `customers` table (replaced by waived_transactions table)

## API Routes

### `/api/waived-transactions`
- **GET** - Fetch all waived transactions for a customer (`?customerId=xxx`)
- **POST** - Create new waived transaction (requires: customer_id, amount, waived_date, optional notes)
- **PUT** - Update existing waived transaction (id, amount, waived_date, notes)
- **DELETE** - Delete a waived transaction (`?id=xxx`)

### Updated: `/api/customers/summary`
- Now calculates total waived amount from `waived_transactions` table
- Sums all waived transactions per customer
- Subtracts total waived from Total Receivables and Total Pending

## Frontend Changes

### Main Dashboard (`/app/page.tsx`)

#### New State
- `waivedTransactions` - Array of waived transaction records
- `waivedDateInput` - Date when amount was waived
- `waivedNotesInput` - Optional notes explaining why

#### Calculation Updates
- **Total Pending**: `expectedTotal - receivedTotal - waivedAmount`
- **Total Receivables**: `expectedTotal + oldDueAmount - receivedTotal - waivedAmount`
- Waived amount correctly reduces both pending and receivables

#### UI Changes
1. **Removed**: Waived Amount tile from KPI section
2. **Updated**: Grid changed back to 7 columns (from 8)
3. **Enhanced Waived Section**:
   - Shows total waived amount with entry count
   - "Add Waived Amount" button
   - Form with fields:
     * Amount (required)
     * Date (required, defaults to today)
     * Notes (optional)
   - Save/Cancel buttons
   - **History display**: Shows all waived transactions with:
     * Amount and date
     * Notes (if provided)
     * Scrollable list (max 40px height)

### Customer Analytics Page (`/app/customers/page.tsx`)
- Updated to fetch waived amounts from `waived_transactions` table
- Calculations automatically updated via summary API

## Features

### 1. Add Waived Amount
- Select a customer
- Click "Add Waived Amount" button
- Fill in:
  * Amount (required, must be > 0)
  * Date (required, defaults to today)
  * Notes (optional - why was it waived?)
- Click Save

### 2. View History
- All waived transactions displayed in chronological order
- Shows amount, date, and notes for each entry
- Scrollable if many entries

### 3. Automatic Calculations
- Total waived = sum of all waived_transactions for customer
- Total Pending automatically reduced by waived amount
- Total Receivables automatically reduced by waived amount
- Shows "After waived amount" note on Total Pending tile

## Data Persistence

### Stored Information
Each waived transaction permanently stores:
1. **Amount** - How much was waived
2. **Date** - When it was waived
3. **Notes** - Why it was waived (optional)
4. **Customer** - Which customer
5. **Timestamps** - Created and updated timestamps

### Benefits
- Full audit trail of all waived amounts
- Can track why amounts were waived over time
- Historical reference for future negotiations
- Multiple waived entries per customer supported

## Migration Steps

### 1. Run Database Migration
Execute `/migrations/create_waived_transactions_table.sql` in Supabase SQL Editor:
- Creates `waived_transactions` table
- Adds indexes for performance
- Sets up triggers for updated_at

### 2. (Optional) Migrate Old Data
If you have existing `waived_amount` data in customers table:
```sql
-- Migrate existing waived amounts to new table
INSERT INTO waived_transactions (customer_id, amount, waived_date, notes)
SELECT 
  id, 
  waived_amount, 
  CURRENT_DATE, 
  'Migrated from old system'
FROM customers
WHERE waived_amount > 0;

-- Then remove old column
ALTER TABLE customers DROP COLUMN IF EXISTS waived_amount;
```

## Example Usage

### Scenario
Customer "MahaLakshmi" negotiates ₹5,000 off a bill due to quality issues.

**Steps**:
1. Select "MahaLakshmi" from dropdown
2. Scroll to "Total Amount Waived" section (amber colored)
3. Click "Add Waived Amount"
4. Enter:
   - Amount: 5000
   - Date: 18-10-2025 (today)
   - Notes: "Quality issue with granite finish - negotiated discount"
5. Click Save

**Result**:
- Waived transaction saved to database
- Total Pending reduced by ₹5,000
- Total Receivables reduced by ₹5,000
- History shows the entry with date and notes
- Future reference available for similar situations

## Technical Notes

### Performance
- Indexes added on `customer_id` and `waived_date` for fast queries
- Waived transactions loaded only for selected customer (not "all")

### Validation
- Amount must be greater than 0 when adding
- Date is required
- Customer selection required (can't add for "all")

### Edge Cases
- Empty notes are stored as NULL
- Multiple waived entries per customer allowed
- Deleting customer cascades to waived_transactions
- Waived amount can never make pending negative (Math.max(0, ...))

## Files Changed
1. `/migrations/create_waived_transactions_table.sql` - New table
2. `/app/api/waived-transactions/route.ts` - New API route
3. `/app/api/customers/summary/route.ts` - Updated calculations
4. `/app/page.tsx` - Enhanced UI with history and form
5. `/app/customers/page.tsx` - Automatically updated via API

## Summary
The waived amount tracking system now maintains a complete, auditable history of all amounts waived from customer bills, with dates and explanatory notes. This provides better financial tracking and historical context for business decisions.
