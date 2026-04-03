# Contractor Carry Forward with Manual Adjustments - Examples

## Scenario 1: Pure Auto-Calculation (No Adjustments)

### March 2026 (Manual - Pre-April)
```
Payable (Manual): ₹100,000
Paid: ₹0
Balance: ₹100,000
```

### April 2026 (Auto-Calculated)
```
Carry Forward: ₹100,000 (from March balance)
Auto-Calculated Payable: ₹18,030 (3,005 SqFt × ₹6)
Paid: ₹0
Balance: ₹100,000 + ₹18,030 - ₹0 = ₹118,030
```

### May 2026 (Auto-Calculated)
```
Carry Forward: ₹118,030 (from April balance) ✅
Auto-Calculated Payable: ₹19,500 (3,250 SqFt × ₹6)
Paid: ₹0
Balance: ₹118,030 + ₹19,500 - ₹0 = ₹137,530
```

---

## Scenario 2: Manual Adjustment Applied

### March 2026 (Manual - Pre-April)
```
Payable (Manual): ₹100,000
Paid: ₹0
Balance: ₹100,000
```

### April 2026 (Adjusted)
```
Carry Forward: ₹100,000 (from March balance)

Auto-Calculated: ₹18,030 (3,005 SqFt × ₹6)
👉 YOU ADJUST TO: ₹20,000 (added ₹1,970 bonus)
manually_adjusted = TRUE

Paid: ₹0
Balance: ₹100,000 + ₹20,000 - ₹0 = ₹120,000
```

### May 2026 (Auto-Calculated)
```
Carry Forward: ₹120,000 (from April balance) ✅✅✅
                 ^
                 |
         Uses ADJUSTED amount (₹20,000)
         NOT auto-calculated (₹18,030)

Auto-Calculated Payable: ₹19,500 (3,250 SqFt × ₹6)
Paid: ₹0
Balance: ₹120,000 + ₹19,500 - ₹0 = ₹139,500
```

**Key Difference:**
- Without adjustment: May starts with ₹118,030
- With adjustment: May starts with ₹120,000
- **Difference: ₹1,970** (your bonus amount cascades forward)

---

## Scenario 3: Adjustment with Payment

### April 2026 (Adjusted + Partially Paid)
```
Carry Forward: ₹100,000
Auto-Calculated: ₹18,030
YOU ADJUST TO: ₹20,000

Paid: ₹50,000 (made a payment)
Balance: ₹100,000 + ₹20,000 - ₹50,000 = ₹70,000
```

### May 2026
```
Carry Forward: ₹70,000 ✅
               ^
               |
         Reflects adjusted payable (₹20,000)
         and payment made (₹50,000)

Auto-Calculated Payable: ₹19,500
Paid: ₹0
Balance: ₹70,000 + ₹19,500 - ₹0 = ₹89,500
```

---

## Scenario 4: Reset to Auto After Adjustment

### April 2026 (Initially Adjusted)
```
Carry Forward: ₹100,000
Adjusted Payable: ₹20,000 (manually_adjusted = TRUE)
Paid: ₹0
Balance: ₹120,000
```

### Later in April: You Click "Reset to Auto"
```
manually_adjusted = FALSE (flag cleared)
System recalculates...
Auto-Calculated Payable: ₹18,630 (3,105 SqFt × ₹6) [New sales added!]
Balance: ₹100,000 + ₹18,630 - ₹0 = ₹118,630
```

### May 2026
```
Carry Forward: ₹118,630 ✅
               ^
               |
         Now uses recalculated amount
         (you gave up manual control)
```

---

## Key Principles

### 1. Balance is King 👑
```
Next Month's Carry Forward = This Month's Balance
```

### 2. Balance Formula
```
Balance = Carry Forward + Payable - Paid
```

### 3. Adjustment Protection
```
If manually_adjusted = TRUE:
  → Auto-calculation SKIPS this record
  → Your amount is LOCKED
  → Carries forward as-is

If manually_adjusted = FALSE:
  → Auto-calculation UPDATES payable
  → Amount changes with new sales/hours
  → New balance carries forward
```

### 4. Chain Effect
```
March Balance
    ↓
April Carry Forward
    +
April Payable (adjusted ₹20,000)
    -
April Paid
    =
April Balance (₹120,000)
    ↓
May Carry Forward (₹120,000) ← Uses your adjustment!
```

---

## Visual Timeline

```
┌─────────────────────────────────────────────────────────────┐
│ March 2026                                                  │
│ Balance: ₹100,000                                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ↓ (carries forward)
┌─────────────────────────────────────────────────────────────┐
│ April 2026                                                  │
│ C/F: ₹100,000                                               │
│ Auto-calc: ₹18,030 → YOU ADJUST TO: ₹20,000 🎯            │
│ Paid: ₹0                                                    │
│ Balance: ₹120,000 (protected from auto-recalc)            │
└──────────────┬──────────────────────────────────────────────┘
               │
               ↓ (carries forward ADJUSTED balance)
┌─────────────────────────────────────────────────────────────┐
│ May 2026                                                    │
│ C/F: ₹120,000 ← Uses your ₹20,000, not ₹18,030! ✅        │
│ Auto-calc: ₹19,500 (new month, fresh calc)                │
│ Paid: ₹0                                                    │
│ Balance: ₹139,500                                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ↓ (continues...)
```

---

## UI Indicators

### When You Adjust (April 2026):
```
┌─────────────────────────────────────────────────┐
│ 🤖 Auto-Calculated Amount: ₹18,030            │
│    SqFt sold × ₹6                              │
│                                                 │
│ Adjusted Payable: [20000] ← Your input        │
│                                                 │
│ 💡 Carry Forward Impact                        │
│ Balance = ₹100,000 + ₹20,000 - ₹0 = ₹120,000 │
│ → Next month's C/F: ₹120,000                  │
└─────────────────────────────────────────────────┘
```

### After Saving (April 2026):
```
┌─────────────────────────────────────────────────┐
│ ✏️ Manually adjusted (auto-calc disabled)      │
│ [Adjust Payable] [🔄 Reset to Auto]           │
│                                                 │
│ Carry Forward: ₹100,000                        │
│ Total Payable: ₹120,000                        │
│   C/F: ₹100,000 + ₹20,000                     │
└─────────────────────────────────────────────────┘
```

### Next Month (May 2026):
```
┌─────────────────────────────────────────────────┐
│ 🤖 Auto-calculated from Sales data             │
│ [Adjust Payable]                               │
│                                                 │
│ Carry Forward: ₹120,000 ← From April!         │
│ Total Payable: ₹139,500                        │
│   C/F: ₹120,000 + ₹19,500                     │
└─────────────────────────────────────────────────┘
```

---

## Summary

✅ **Adjusted amounts carry forward** - Your manual changes persist through months
✅ **Balance is what carries** - Not just payable, but the full balance calculation
✅ **Protected from overwrites** - Once adjusted, auto-calc won't change it
✅ **Transparent in UI** - See the carry forward impact before saving
✅ **Reversible** - Reset to auto if you change your mind

🎯 **Bottom Line:** Your adjustments are treated as **final settlement amounts** and carry forward exactly as you set them!
