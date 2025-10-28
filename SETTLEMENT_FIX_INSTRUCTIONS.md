# 🔧 SETTLEMENT FIX - COMPLETE STEP-BY-STEP GUIDE

**Time Required:** 15-20 minutes  
**Risk Level:** LOW (following these steps carefully)  
**Your Business Impact:** Will prevent future settlement bugs, won't touch existing data

---

## ✅ **PHASE 1: INVESTIGATION** (5 minutes)

### **Step 1: Open Supabase**
1. Go to your Supabase dashboard at `https://app.supabase.com`
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

### **Step 2: Run Query 1 - Check Settled Accounts**

Copy and paste this query into the SQL Editor:

```sql
SELECT 
    c.name as customer_name,
    cap.period_number,
    cap.settlement_date,
    cap.total_invoiced,
    cap.total_received,
    cap.settlement_amount,
    cap.waived_amount,
    cap.settlement_mode
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE cap.is_active = false
  AND cap.settlement_date IS NOT NULL
ORDER BY cap.settlement_date DESC
LIMIT 10;
```

**Click "Run"**

**📝 Write down:** How many rows were returned? _____ rows

### **Step 3: Run Query 2 - Check Settlement Transactions**

Copy and paste this query:

```sql
SELECT 
    c.name as customer_name,
    t.date,
    t.amount,
    t.mode,
    t.note
FROM transactions t
JOIN customers c ON c.id = t.customer_id
WHERE t.note LIKE '%Settlement%'
   OR t.note LIKE '%Account settled%'
ORDER BY t.date DESC
LIMIT 10;
```

**Click "Run"**

**📝 Write down:** How many rows were returned? _____ rows

### **Step 4: Run Query 3 - Check Waived Amounts**

Copy and paste this query:

```sql
SELECT 
    name as customer_name,
    waived_amount,
    old_due_amount
FROM customers
WHERE waived_amount > 0
ORDER BY name;
```

**Click "Run"**

**📝 Write down:** How many rows were returned? _____ rows

---

## ✅ **PHASE 2: CREATE BACKUP** (2 minutes)

This is your safety net! Even though we're only changing code (not data), let's be extra safe.

### **Step 5: Backup Database Tables**

In the same Supabase SQL Editor, copy and paste ALL of these queries together:

```sql
-- Create backup tables with today's date
CREATE TABLE customer_account_periods_backup_20251028 AS 
SELECT * FROM customer_account_periods;

CREATE TABLE customers_backup_20251028 AS
SELECT * FROM customers;

CREATE TABLE transactions_backup_20251028 AS
SELECT * FROM transactions;

CREATE TABLE waived_transactions_backup_20251028 AS
SELECT * FROM waived_transactions;

-- Confirm backups created
SELECT 
    'customer_account_periods' as table_name,
    COUNT(*) as rows_backed_up
FROM customer_account_periods_backup_20251028
UNION ALL
SELECT 
    'customers',
    COUNT(*)
FROM customers_backup_20251028
UNION ALL
SELECT 
    'transactions',
    COUNT(*)
FROM transactions_backup_20251028
UNION ALL
SELECT 
    'waived_transactions',
    COUNT(*)
FROM waived_transactions_backup_20251028;
```

**Click "Run"**

You should see a table showing how many rows were backed up for each table.

✅ **Checkpoint:** Backups created successfully!

---

## ✅ **PHASE 3: FIX THE CODE** (5 minutes)

Now we'll fix the duplicate transaction bug. This is the main fix!

### **Step 6: Open VS Code**

You should already have the project open. If not:
1. Open VS Code
2. Open folder: `/Users/bala/Downloads/granite-ledger-1`

### **Step 7: Open the Settlement API File**

1. In VS Code, press `Cmd+P` (Mac) or `Ctrl+P` (Windows)
2. Type: `settlement/route.ts`
3. Press Enter to open the file
4. You should see: `app/api/customers/settlement/route.ts`

### **Step 8: Find the Problem Code**

1. Press `Cmd+F` (Mac) or `Ctrl+F` (Windows) to search
2. Search for: `If settlement includes payment`
3. You should see this around line 82:

```typescript
    // If settlement includes payment, create a transaction record
    if (settlementAmount > 0 && settlementMode !== 'PARTIAL_WAIVER') {
```

### **Step 9: Comment Out the Problem Code**

You'll see a block of code from around line 82 to 100. 

**CAREFULLY select these exact lines** (from `// If settlement` to the closing `}`):

```typescript
    // If settlement includes payment, create a transaction record
    if (settlementAmount > 0 && settlementMode !== 'PARTIAL_WAIVER') {
      // Get default bank account
      const { data: accounts } = await supabaseAdmin
        .from('bank_accounts')
        .select('id')
        .limit(1);

      if (accounts && accounts.length > 0) {
        await supabaseAdmin.from('transactions').insert({
          customer_id: customerId,
          date: new Date().toISOString().split('T')[0],
          mode: settlementMode === 'CASH' ? 'CASH' : 'RTGS',
          account_id: accounts[0].id,
          amount: settlementAmount,
          note: `Settlement payment - ${settlementNotes || 'Account settled'}`
        });
      }
    }
```

**Now comment it out:**
1. Select all those lines
2. Press `Cmd+/` (Mac) or `Ctrl+/` (Windows)

It should now look like this:

```typescript
    // // If settlement includes payment, create a transaction record
    // if (settlementAmount > 0 && settlementMode !== 'PARTIAL_WAIVER') {
    //   // Get default bank account
    //   const { data: accounts } = await supabaseAdmin
    //     .from('bank_accounts')
    //     .select('id')
    //     .limit(1);

    //   if (accounts && accounts.length > 0) {
    //     await supabaseAdmin.from('transactions').insert({
    //       customer_id: customerId,
    //       date: new Date().toISOString().split('T')[0],
    //       mode: settlementMode === 'CASH' ? 'CASH' : 'RTGS',
    //       account_id: accounts[0].id,
    //       amount: settlementAmount,
    //       note: `Settlement payment - ${settlementNotes || 'Account settled'}`
    //     });
    //   }
    // }
```

### **Step 10: Add a Comment Explaining Why**

Right before the commented code, add this comment:

```typescript
    // BUG FIX (2025-10-28): Removed duplicate transaction creation
    // Settlement amount is already recorded in customer_account_periods.settlement_amount
    // Creating a transaction here causes double-counting in total_received
    // The database function handles all the financial recording
```

### **Step 11: Save the File**

Press `Cmd+S` (Mac) or `Ctrl+S` (Windows)

✅ **Checkpoint:** Code fix applied!

---

## ✅ **PHASE 4: TEST THE FIX** (5 minutes)

### **Step 12: Deploy to Development**

In VS Code terminal (at the bottom), run:

```bash
npm run build
```

Wait for it to complete. You should see: `✓ Compiled successfully`

### **Step 13: Check for Errors**

Look for any red error messages. If you see:
- ✅ "Compiled successfully" - Good! Continue
- ❌ Any TypeScript errors - Something went wrong, ask for help

### **Step 14: Test in Your Application**

1. Open your application in browser
2. Go to a customer page
3. Try to view customer details
4. Make sure everything loads correctly

**DO NOT settle an account yet!** We're just checking that the app still works.

✅ **Checkpoint:** Application works normally!

---

## ✅ **PHASE 5: VERIFY THE FIX** (Optional - Only if you want to test settlement)

### **Step 15: Test with a Test Customer**

**IMPORTANT:** Only do this if you have a test customer you don't mind experimenting with.

1. Go to a customer with small amounts
2. Make sure all payments are received and balance is zero
3. Try to settle the account
4. Check that:
   - ✅ Settlement completes successfully
   - ✅ Settlement history shows correct data
   - ✅ No duplicate RTGS transaction appears on current page
   - ✅ Waived amount is cleared (if there was any)

---

## ✅ **PHASE 6: COMMIT YOUR CHANGES**

### **Step 16: Save to Git**

In VS Code terminal, run these commands:

```bash
git add app/api/customers/settlement/route.ts
git commit -m "fix: remove duplicate transaction creation during settlement

- Commented out code that creates duplicate RTGS transaction
- Settlement amount is already recorded in settlement_amount field
- Prevents double-counting in total_received
- Prevents settlement transaction from appearing on current page"
git push
```

✅ **Done! Changes saved to repository**

---

## 🎉 **WHAT YOU'VE ACCOMPLISHED**

✅ **Fixed the duplicate transaction bug** - Future settlements won't create duplicate RTGS transactions  
✅ **Kept your data safe** - Created backups before making changes  
✅ **Preserved existing records** - No changes to historical data  
✅ **Documented the fix** - Added comments explaining why  

---

## 🔍 **WHAT HAPPENS NOW**

### **For Future Settlements:**
- ✅ Settlement amount will be recorded ONLY in `settlement_amount` field
- ✅ No duplicate transaction will be created
- ✅ Settlement won't appear on current transactions page
- ✅ Settlement history will show correct data

### **For Past Settlements:**
If you had settlements before this fix:
- Those settlement transactions will remain in your database
- They're already recorded in history
- **Option 1:** Leave them as-is (they're historical records)
- **Option 2:** We can clean them up later if you want (separate process)

---

## 🆘 **IF SOMETHING GOES WRONG**

### **To Undo the Code Fix:**
1. Open `app/api/customers/settlement/route.ts`
2. Uncomment the lines you commented (remove the `//` at the start)
3. Save the file
4. Run `npm run build`

### **To Restore Database (if needed):**
In Supabase SQL Editor:
```sql
-- Only run this if you need to restore
DROP TABLE customer_account_periods;
CREATE TABLE customer_account_periods AS 
SELECT * FROM customer_account_periods_backup_20251028;

-- Repeat for other tables if needed
```

---

## 📞 **NEXT STEPS**

After you've completed all steps:
1. Use your application normally
2. When you settle the next customer account, observe the behavior
3. Check that no duplicate RTGS transaction appears
4. Verify settlement history looks correct

**If everything works well, you're done! 🎉**

---

## ❓ **QUESTIONS TO ASK IF YOU NEED HELP**

- "I got an error at Step X, what should I do?"
- "The investigation queries returned Y rows, is that normal?"
- "After the fix, I'm seeing behavior Z, is that expected?"
- "Can you help me clean up old settlement transactions?"

---

**Created:** October 28, 2025  
**Your Safety:** Top Priority  
**Your Business:** Protected
