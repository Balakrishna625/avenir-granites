# Customer Settlement System - Zero Balance Fresh Start

## Overview
The customer settlement system ensures that when a customer settles their account, all their balances are properly cleared and they start fresh with a clean slate for the new period.

## How Settlement Resets to Zero

### 1. **Settlement Process Flow**

When you click "Settle Account", the system:

1. **Closes the Current Period**
   - Marks the current `customer_account_period` as `is_active = false`
   - Records settlement details (date, amount, payment mode, reference, notes)
   - Calculates final balances for the period

2. **Handles Remaining Balance**
   - **Option A: Waive Remaining** (checked)
     - Remaining balance is added to `waived_transactions` table
     - Customer starts the new period with **₹0 old dues**
   
   - **Option B: Carry Forward** (unchecked)
     - Remaining balance is stored in `customer.old_due_amount`
     - This amount shows up as "Old Dues" in the next period

3. **Creates New Active Period**
   - Creates a new `customer_account_period` with `is_active = true`
   - Period number increments (e.g., Period #1 → Period #2)
   - New period starts with:
     - **Current invoices**: ₹0
     - **Current payments**: ₹0
     - **Old dues**: ₹0 (if waived) OR remaining balance (if carried forward)

### 2. **Database Schema - Key Fields**

#### `customer_account_periods` Table
```sql
- id (uuid)
- customer_id (uuid)
- period_number (integer) -- Auto-increments
- start_date (date) -- Start of period
- end_date (date) -- When settled
- is_active (boolean) -- Only one active period per customer
- settlement_date (date)
- settlement_amount (numeric) -- Amount paid during settlement
- settlement_mode (text) -- RTGS, Cash, etc.
- settlement_reference (text)
- settlement_notes (text)
- carried_forward (numeric) -- Balance carried to next period
```

#### `consignments` Table
```sql
- period_id (uuid) -- Links to customer_account_periods
-- All new consignments get the ACTIVE period_id
```

#### `transactions` Table
```sql
- period_id (uuid) -- Links to customer_account_periods
-- All new transactions get the ACTIVE period_id
```

#### `waived_transactions` Table
```sql
- customer_id (uuid)
- amount (numeric) -- Amount forgiven
- waived_date (date)
- reason (text)
-- Stores all waived amounts (lifetime total)
```

### 3. **Automatic Period Assignment**

The system uses **database triggers** to automatically assign the correct period:

```sql
-- Trigger: assign_period_to_consignment
-- When: New consignment inserted
-- Action: Automatically sets period_id to the customer's ACTIVE period

-- Trigger: assign_period_to_transaction
-- When: New transaction inserted
-- Action: Automatically sets period_id to the customer's ACTIVE period
```

This ensures:
- ✅ All new consignments go to the current active period
- ✅ All new transactions go to the current active period
- ✅ Old data remains in archived periods
- ✅ No manual period assignment needed

### 4. **Example Settlement Scenario**

#### Before Settlement (Period #1)
```
Customer: MahaLakshmi
Current Period: #1
------------------
Total Invoiced: ₹41,55,524
Total Received: ₹40,85,858
Total Pending:  ₹69,666
Old Due Amount: ₹0
------------------
TOTAL OWED: ₹69,666
```

#### Settlement Options

**Option A: Customer Pays ₹69,666 (Full Payment)**
```
Settlement Amount: ₹69,666
Waive Remaining: No (nothing to waive)
Result: Period #2 starts with ₹0 balance ✅
```

**Option B: Customer Pays ₹60,000 + Waive ₹9,666**
```
Settlement Amount: ₹60,000
Waive Remaining: YES
Result: 
- ₹9,666 added to waived_transactions
- Period #2 starts with ₹0 balance ✅
```

**Option C: Customer Pays ₹60,000 (Carry Forward ₹9,666)**
```
Settlement Amount: ₹60,000
Waive Remaining: NO
Result:
- customer.old_due_amount = ₹9,666
- Period #2 starts with ₹9,666 old dues
```

#### After Settlement (Period #2)
```
Customer: MahaLakshmi
Current Period: #2 (ACTIVE)
------------------
Total Invoiced: ₹0 (fresh start!)
Total Received: ₹0 (fresh start!)
Total Pending:  ₹0
Old Due Amount: ₹0 (if waived) OR ₹9,666 (if carried forward)
------------------
```

Period #1 is now ARCHIVED and can be viewed in "Settlement History"

### 5. **Viewing Settlement History**

#### Individual Customer View
1. Go to **Customer Admin** → Click customer card
2. Click **"Settlement History"** tab
3. See all archived periods with complete transaction history

#### All Customers View
1. Go to **Customer Management** → **Settlement History** (sidebar)
2. See all settlements across all customers
3. Filter by customer name, date range
4. Expand any period to see detailed consignments and transactions

### 6. **Key Benefits**

✅ **Clean Slate**: Each settlement creates a fresh start  
✅ **Historical Preservation**: All old data is preserved in archived periods  
✅ **Flexible**: Choose to waive or carry forward remaining balance  
✅ **Audit Trail**: Complete history of all settlements and periods  
✅ **Automatic**: Period assignment happens automatically via triggers  
✅ **Zero Maintenance**: No manual cleanup required  

### 7. **Business Rules**

1. **One Active Period Per Customer**
   - Only one period can be `is_active = true` at a time
   - Settling automatically creates the next period

2. **Period Numbers Auto-Increment**
   - Period #1, #2, #3, etc.
   - Helps track how many times customer has settled

3. **Cannot Delete Archived Periods**
   - Archived periods are read-only for audit purposes
   - Consignments and transactions remain linked forever

4. **Waived vs Carried Forward**
   - Waived: Amount forgiven, does NOT appear in next period
   - Carried Forward: Amount moves to `old_due_amount` in next period

### 8. **API Endpoints**

- `GET /api/customers/periods` - Get all settlement periods
- `GET /api/customers/periods?customerId=xxx` - Get periods for specific customer
- `POST /api/customers/settlement` - Settle an account
- `GET /api/consignments?periodId=xxx` - Get consignments for specific period
- `GET /api/transactions?periodId=xxx` - Get transactions for specific period

### 9. **Common Questions**

**Q: What happens to invoices created during the old period?**  
A: They remain in the archived period and can be viewed in Settlement History.

**Q: Can I undo a settlement?**  
A: No, settlements are permanent for audit trail purposes. However, you can manually adjust the next period's old_due_amount if needed.

**Q: What if customer pays more than owed?**  
A: Excess amount becomes a credit (negative old_due_amount) in the next period.

**Q: How do I know which period a consignment belongs to?**  
A: Check the `period_id` field. It links to `customer_account_periods` table.

**Q: Does settlement affect other customers?**  
A: No, each customer has independent periods and settlements.

---

## Summary

The settlement system ensures **ZERO balance fresh start** by:
1. Archiving the current period with all its data
2. Creating a new active period
3. Resetting all current balances to ₹0
4. Optionally carrying forward or waiving remaining balance
5. Automatically assigning new transactions to the new period

This provides a clean accounting structure while preserving complete historical records! 🎉
