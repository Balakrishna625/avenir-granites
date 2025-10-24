# Opening Balance Adjustment Feature

## Problem Statement
You started tracking expenses and collections from October 2025, but there were settlements and transactions before this date. For example:
- **Prudhvi A/C** shows **-₹43,818** based on tracked data
- But actual balance considering pre-tracking settlements is **-₹114**
- Difference: **₹43,704** needs to be adjusted

## Solution
Added an **Opening Balance Adjustment** feature to account for pre-tracking settlements without confusing new users.

## How It Works

### 1. Database Table
Created `bank_account_adjustments` table that stores:
- One adjustment per bank account
- Adjustment amount (positive or negative)
- Notes explaining the adjustment
- Effective date

### 2. Calculation Logic
**New Opening Balance Formula:**
```
Opening Balance = (Previous Transactions - Previous Expenses) + Adjustment Amount
Current Balance = Opening Balance + Current Received - Current Expenses
```

### 3. User Interface

#### Accessing the Feature:
1. Go to **Expense Management** page
2. Look at the **Bank Collections** tiles at the top
3. Each tile has a **⚙️ Settings icon** in the top-right corner
4. Click the icon to adjust the opening balance

#### Setting an Adjustment:
1. Click **⚙️ Settings** on the account tile (e.g., Prudhvi A/C)
2. Modal opens: "Adjust Opening Balance"
3. Enter adjustment amount:
   - **Negative value** (e.g., `-43704`) = Reduce opening balance
   - **Positive value** (e.g., `50000`) = Increase opening balance
4. Add notes (optional): e.g., "Previous settlements before Oct 2025"
5. Click **Save Adjustment**

### 4. Example: Fixing Prudhvi Account

**Current Situation:**
- System shows: **-₹43,818**
- Actual balance should be: **-₹114**
- Difference: **₹43,704** (system is showing ₹43,704 MORE debt than actual)

**Steps to Fix:**
1. Click ⚙️ on Prudhvi A/C tile
2. Enter adjustment: **-43704** (negative because we need to reduce the shown debt)
3. Notes: "Previous settlements made before Oct 2025 tracking"
4. Save

**Result:**
- Opening balance automatically adjusts by -₹43,704
- Current balance now shows correct **-₹114**
- All future calculations include this adjustment
- Explanation is stored in notes for new users

## Installation Steps

### 1. Run Database Migration
```sql
-- Run this in Supabase SQL Editor:
-- File: supabase/migrations/20251024_add_bank_account_adjustments.sql
```

### 2. Deploy Code
Already updated:
- ✅ API: `/api/bank-accounts/balance-after-expenses` (includes adjustments)
- ✅ API: `/api/bank-accounts/adjustments` (manage adjustments)
- ✅ UI: Expenses page with adjustment modal

## Benefits

### For You (Admin):
- Fix historical balance discrepancies
- Clean starting point from current month
- Transparent tracking going forward

### For New Users:
- See correct current balances
- Adjustment is hidden in opening balance calculation
- Notes explain any unusual starting balances
- Can review adjustment anytime via Settings icon

## Technical Details

### API Endpoints

#### Get Adjustments
```
GET /api/bank-accounts/adjustments
Returns: List of all adjustments with account details
```

#### Set/Update Adjustment
```
POST /api/bank-accounts/adjustments
Body: {
  bank_account_id: "uuid",
  adjustment_amount: -43704,
  notes: "Previous settlements",
  effective_date: "2025-10-01"
}
```

### Balance Calculation Flow
```
1. Fetch bank accounts
2. Fetch adjustments (one per account)
3. Calculate opening balance BEFORE selected month:
   - Sum all transactions before month
   - Subtract all expenses before month
   - ADD adjustment amount
4. Calculate current period:
   - Add received in month
   - Subtract expenses in month
5. Display: Opening + Received - Expenses = Current Balance
```

## Usage Examples

### Example 1: Reduce Debt (Prudhvi Case)
- Shown: -₹43,818
- Actual: -₹114
- Adjustment: **-43,704**
- Result: Corrects to -₹114

### Example 2: Add Previous Credit
- Account has ₹10,000 from old settlements not tracked
- Adjustment: **+10,000**
- Result: Opening balance increases by ₹10,000

### Example 3: Multiple Accounts
Each account can have its own adjustment:
- Ramya: **-50,000**
- Prudvi: **-43,704**
- Avenir: **0** (no adjustment needed)

## Future Maintenance

### Updating an Adjustment
- Click ⚙️ on the same account tile
- Enter new amount (overwrites previous)
- Previous notes are preserved unless changed

### Viewing Adjustment History
Currently shows in opening balance. Future enhancement could add:
- Adjustment history log
- Audit trail of changes
- Detailed breakdown in UI

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Open Expense Management page
- [ ] Click ⚙️ on Prudhvi tile
- [ ] Enter: **-43704**
- [ ] Add notes: "Pre-Oct 2025 settlements"
- [ ] Save and verify balance changes
- [ ] Refresh page - adjustment persists
- [ ] Test other accounts
- [ ] Export to Excel - verify numbers match
