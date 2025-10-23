# Expense Management - Updated Architecture

## Problem Statement
We need to track:
1. **Customer Payments** - Total money received (never affected by expenses)
2. **Current Balance** - Money available after deducting expenses
3. When transaction added → Update both Customer page AND Expense page
4. When expense added → Only deduct from Expense page balance

## Solution Architecture

### Page 1: All Customers Page (Bank Collections)
**API**: `/api/bank-accounts/summary`

Shows **TOTAL RECEIVED** (never changes from expenses):
```
IDBI RTGS A/C: ₹67,95,651
├── RTGS: ₹67,95,651
└── Cash: ₹0

ANURAG A/C: ₹13,55,537
├── RTGS: ₹0
└── Cash: ₹13,55,537
```

**This shows**: How much we collected from customers (raw collections)
**Updates when**: New transaction is recorded
**Never changes from**: Expenses

---

### Page 2: Expense Management Page (Current Balance)
**API**: `/api/bank-accounts/balance-after-expenses`

Shows **CURRENT BALANCE** (after deducting expenses):
```
IDBI RTGS A/C
Current Balance: ₹65,00,000  👈 (Received - Expenses)

Details:
├── Received: ₹67,95,651
│   ├── RTGS: ₹67,95,651
│   └── Cash: ₹0
└── Expenses: -₹2,95,651  👈 Deducted
```

**This shows**: How much money is available now (after spending)
**Updates when**: 
  - New transaction recorded → Increases balance
  - New expense added → Decreases balance

---

## Data Flow

### Scenario 1: New Transaction Added
```
Customer pays ₹5,00,000 to IDBI RTGS A/C

1. Create transaction record
2. All Customers Page: ₹67,95,651 → ₹72,95,651 ✅
3. Expense Management: ₹65,00,000 → ₹70,00,000 ✅
   (Because totalReceived increased)
```

### Scenario 2: New Expense Added
```
Spend ₹50,000 from IDBI RTGS A/C

1. Create expense record (account_id = IDBI account)
2. All Customers Page: ₹67,95,651 (NO CHANGE) ✅
3. Expense Management: ₹65,00,000 → ₹64,50,000 ✅
   (Because totalExpenses increased)
```

---

## Database Tables

### transactions table
```sql
- customer_id
- account_id → bank_accounts(id)
- amount
- mode (RTGS/CASH)
- date
```
**Purpose**: Track customer payments

### expenses table
```sql
- account_id → bank_accounts(id)  👈 Changed to bank_accounts
- amount
- total_amount
- date
```
**Purpose**: Track business expenses

### bank_accounts table
```sql
- id
- name
- account_type
```
**Purpose**: Master list of accounts (both tables reference this)

---

## API Endpoints

### `/api/bank-accounts/summary`
**Used by**: All Customers Page
**Returns**:
```json
[
  {
    "id": "uuid",
    "name": "IDBI RTGS A/C",
    "total": 6795651,      // Sum of transactions only
    "rtgs": 6795651,
    "cash": 0
  }
]
```

### `/api/bank-accounts/balance-after-expenses`
**Used by**: Expense Management Page
**Returns**:
```json
[
  {
    "id": "uuid",
    "name": "IDBI RTGS A/C",
    "totalReceived": 6795651,    // Sum of transactions
    "rtgs": 6795651,
    "cash": 0,
    "totalExpenses": 295651,     // Sum of expenses from this account
    "currentBalance": 6500000    // totalReceived - totalExpenses
  }
]
```

---

## Migration Applied

**File**: `20251023_expenses_use_bank_accounts.sql`

Changed `expenses.account_id` foreign key:
- **Before**: Referenced `expense_accounts` table
- **After**: References `bank_accounts` table

This allows expenses to be linked to customer collection accounts.

---

## Summary

✅ **Customer Payments Page** shows raw collections (unaffected by expenses)
✅ **Expense Management Page** shows current balance (after expenses)
✅ New transaction → Updates both pages
✅ New expense → Only updates Expense Management page
✅ Both pages share the same bank_accounts master list
✅ Proper accounting: Collections - Expenses = Available Balance
