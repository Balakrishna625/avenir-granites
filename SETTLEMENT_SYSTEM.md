# Customer Account Settlement System

## Overview
The customer account settlement system allows you to handle situations where customers pay all their outstanding dues and want to start fresh with a new account period. All historical data is preserved and can be viewed at any time.

## Key Features

### 1. **Account Periods**
- Each customer can have multiple account periods (Period 1, Period 2, etc.)
- Only one period is active at a time
- Historical periods are permanently archived with all their data

### 2. **Settlement Process**
When you settle a customer's account:
1. The current period is closed with final balances
2. A new period is automatically created
3. All existing consignments and transactions remain linked to their original period
4. New business starts in the fresh period

### 3. **Settlement Options**

#### Payment Modes:
- **RTGS/NEFT/Bank Transfer**: For wire transfers
- **Cash**: For cash payments
- **Cheque**: For check payments
- **UPI**: For UPI payments
- **Partial Payment + Waive Rest**: Customer pays partial amount, rest is waived
- **Full Waiver**: No payment, full amount is forgiven

#### Financial Handling:
- **Full Payment**: Customer pays entire outstanding amount
- **Partial Payment**: Customer pays some amount, rest is:
  - Carried forward to new period (default)
  - Waived/forgiven (if "Waive remaining balance" is checked)

## Database Schema

### New Table: `customer_account_periods`
```sql
- id: UUID (primary key)
- customer_id: UUID (foreign key to customers)
- period_number: INTEGER (auto-incrementing per customer)
- start_date: DATE (when period started)
- end_date: DATE (null for active period, filled when settled)
- is_active: BOOLEAN (only one active period per customer)
- opening_balance: DECIMAL (balance carried from previous period)
- closing_balance: DECIMAL (final balance when period closed)
- total_invoiced: DECIMAL
- total_received: DECIMAL
- total_waived: DECIMAL
- settlement_amount: DECIMAL
- settlement_mode: TEXT
- settlement_reference: TEXT
- settlement_notes: TEXT
- settled_by: TEXT
```

### Modified Tables:
- **consignments**: Added `period_id` column (links to active period)
- **transactions**: Added `period_id` column (links to active period)

## API Endpoints

### 1. Settlement Operations
**POST** `/api/customers/settlement`
```json
{
  "customerId": "uuid",
  "settlementAmount": 50000,
  "settlementMode": "RTGS",
  "settlementReference": "TXN123456",
  "settlementNotes": "Full settlement",
  "waiveRemaining": false,
  "settledBy": "admin"
}
```

**GET** `/api/customers/settlement?customerId=uuid`
Returns all settlement periods for a customer

### 2. Period Details
**GET** `/api/customers/periods/[periodId]`
Returns detailed information for a specific period including:
- Period metadata
- All consignments in that period
- All transactions in that period
- Financial summary

## Database Functions

### `get_or_create_active_period(customer_id UUID)`
- Automatically creates or retrieves the active period for a customer
- Called by triggers when inserting consignments or transactions

### `settle_customer_account(...)`
Parameters:
- `customer_id_param`: Customer to settle
- `settlement_amount_param`: Amount being paid
- `settlement_mode_param`: Payment mode
- `settlement_reference_param`: Reference number
- `settlement_notes_param`: Additional notes
- `waive_remaining_param`: Whether to waive unpaid balance
- `settled_by_param`: Who performed the settlement

Returns: `new_period_id`

## Triggers

### Auto-Assignment Triggers
Automatically assign `period_id` when creating:
- New consignments → `before_insert_consignment_assign_period`
- New transactions → `before_insert_transaction_assign_period`

This ensures all new records are automatically linked to the customer's active period.

## Views

### `customer_current_summary`
Shows current period summary for all customers:
- Total invoiced, received, pending, waived
- Period number and dates
- Customer details

### `customer_period_history`
Shows all historical periods for all customers:
- Includes settlement details
- Financial summary per period
- Customer information

## User Interface

### 1. Customer Detail Page
**Route**: `/customers/[id]`

Features:
- Current period financial overview
- "Settle Account" button
- Two tabs:
  - **Current Period**: Shows active consignments & transactions
  - **Settlement History**: Shows all past periods

### 2. Settlement Modal
Workflow:
1. **Confirmation Step**: Shows current balances and settlement information
2. **Details Step**: Enter settlement details (amount, mode, reference, notes)
3. **Processing Step**: Settlement in progress
4. **Success Step**: Settlement complete, new period created

### 3. Period History Viewer
- Expandable list of all account periods
- Each period shows:
  - Period number and date range
  - Financial summary (invoiced, received, waived, settled)
  - Settlement details (mode, reference, notes)
  - Consignment and transaction counts
  - Link to view full period details

## Usage Examples

### Example 1: Full Settlement with Payment
```
Customer: ABC Ltd
Current Balance: ₹1,00,000
Old Due Amount: ₹20,000
Total Owed: ₹1,20,000

Settlement:
- Mode: RTGS
- Amount: ₹1,20,000
- Reference: TXN789456

Result:
- Period 1 closed with ₹1,20,000 settlement
- Period 2 created with ₹0 opening balance
```

### Example 2: Partial Payment with Waiver
```
Customer: XYZ Corp
Current Balance: ₹80,000
Old Due Amount: ₹10,000
Total Owed: ₹90,000

Settlement:
- Mode: PARTIAL_WAIVER
- Amount: ₹70,000
- Waive Remaining: Yes (₹20,000 waived)

Result:
- Period 1 closed with ₹70,000 payment + ₹20,000 waived
- Period 2 created with ₹0 opening balance
```

### Example 3: Partial Payment Carried Forward
```
Customer: DEF Industries
Current Balance: ₹1,50,000
Old Due Amount: ₹0
Total Owed: ₹1,50,000

Settlement:
- Mode: CASH
- Amount: ₹1,00,000
- Waive Remaining: No

Result:
- Period 1 closed with ₹1,00,000 payment
- Period 2 created with ₹50,000 opening balance (carried forward)
```

## Data Migration

The migration script automatically:
1. Creates initial periods for all existing customers
2. Assigns all existing consignments to their customer's initial period
3. Assigns all existing transactions to their customer's initial period
4. Ensures data integrity with foreign key constraints

## Best Practices

1. **Before Settlement**:
   - Verify all consignments are recorded
   - Verify all transactions are recorded
   - Review the total receivables amount

2. **During Settlement**:
   - Use appropriate payment mode
   - Add reference number for bank transfers
   - Add notes explaining any special circumstances
   - Decide whether to carry forward or waive any remaining balance

3. **After Settlement**:
   - Verify new period was created
   - Verify opening balance in new period
   - Keep settlement record for auditing

4. **Viewing Historical Data**:
   - Use the "Settlement History" tab on customer detail page
   - Each period is expandable to view details
   - Historical periods are read-only

## Security & Data Integrity

- **Constraints**: Only one active period per customer (enforced at database level)
- **Foreign Keys**: All periods, consignments, and transactions properly linked
- **Soft Archive**: Old periods are never deleted, only closed
- **Audit Trail**: Settlement details include who, when, why, and how much
- **Transaction Safety**: Settlement uses database transactions for atomicity

## Troubleshooting

### Issue: "Only one active period allowed"
**Solution**: This means the customer already has an active period. Settlement process should close it before creating new one.

### Issue: Consignments/Transactions showing in wrong period
**Solution**: Triggers automatically assign period_id. If manually created, ensure triggers are enabled.

### Issue: Cannot view old period data
**Solution**: Check that the period_id foreign key relationships are intact. Use the period details API endpoint.

## Future Enhancements

Potential additions:
- Export period data to PDF
- Email settlement receipts
- Bulk settlement for multiple customers
- Settlement approval workflow
- Period comparison reports
- Automated settlement reminders
