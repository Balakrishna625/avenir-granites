# Sales Management Feature - Complete Guide

## 🎉 Feature Overview

The **Sales Management** feature allows you to:
- Create multi-line-item sales records with material details
- Automatically create consignment records for customers
- Track payment splits (RTGS + Cash)
- Add additional charges (Tax, Mining, Loading)
- View complete sales history

## 📋 What Was Created

### 1. Database Tables
**File:** `supabase/migrations/20251024_create_sales_tables.sql`

Three new tables:
- **`material_types`** - Master data for material types (Granite, Marble, Quartz, Tiles, Other)
- **`sales`** - Sales header (customer, date, totals, charges, payment split)
- **`sale_items`** - Line items for each sale

**Key Features:**
- Auto-generate sale numbers (SALE-25-001, SALE-25-002, etc.)
- Auto-calculate totals from line items using triggers
- Auto-update gross total when charges change
- Links to consignment records

### 2. API Endpoints

**`/api/sales`** (GET, POST)
- GET: List all sales with customer and line items
- POST: Create sale + auto-create consignment record

**`/api/material-types`** (GET)
- Get list of material types for dropdown

### 3. Sales Page UI
**File:** `app/sales/page.tsx`

**Features:**
- Customer dropdown (from existing customers)
- Sale date picker
- **Dynamic line items table:**
  * Material type dropdown
  * Slabs count
  * Square feet
  * Rate per sq. ft.
  * Auto-calculated total (sqft × rate)
  * Add/Remove rows
- **Summary section** (auto-calculated):
  * Total slabs
  * Total sq. ft.
  * Sub-total amount
- **Additional charges:**
  * Tax amount
  * Mining amount
  * Loading amount
- **Gross total** = Sub-total + Tax + Mining + Loading
- **Payment split:**
  * RTGS expected
  * Cash expected
  * Validation: RTGS + Cash must equal Gross Total
- **Remarks** (optional)
- **Sales history table**

### 4. Sidebar Navigation
**File:** `components/Sidebar.tsx`

Added "Sales Management" menu item:
- Icon: ShoppingBag (shopping bag icon)
- Position: After Customer Management, before Consignment Management
- Route: `/sales`

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** (https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of:
   ```
   supabase/migrations/20251024_create_sales_tables.sql
   ```
6. Click **Run** (or press Ctrl+Enter)
7. Verify success message

This will create:
- `material_types` table (with 5 default types)
- `sales` table
- `sale_items` table
- Auto-calculation triggers
- Sale number generator function

### Step 2: Test the Feature

1. Start your development server (if not running):
   ```bash
   npm run dev
   ```

2. Open your app in browser

3. Click **"Sales Management"** in sidebar

4. **Create a Test Sale:**
   - Select customer
   - Choose today's date
   - Add line items:
     * Material: Granite Slab
     * Slabs: 10
     * Sq. Ft.: 500.00
     * Rate: 150.00
     * Total will auto-calculate: ₹75,000.00
   - Add charges (optional):
     * Tax: 5,000
     * Mining: 2,000
     * Loading: 1,000
   - Gross total: ₹83,000.00
   - Payment split:
     * RTGS: 80,000
     * Cash: 3,000
   - Click **"Create Sale & Consignment"**

5. **Verify Success:**
   - Green toast notification: "Sale created successfully! Consignment auto-added to customer account."
   - New sale appears in Sales History table
   - Check customer's account - new consignment should be visible
   - Check "All Customers" page - customer's total should be updated

## 📊 How It Works

### Auto-Consignment Creation

When you create a sale, the system automatically:

1. **Creates the sale record** with all line items
2. **Creates a consignment** with:
   - Date: Same as sale date
   - Customer: Same customer
   - Total: Gross total
   - RTGS Expected: From payment split
   - Cash Expected: From payment split
   - Balance: Gross total (unpaid initially)
   - Remarks: "Auto-created from SALE-25-001"

3. **Links them together**: Sale stores consignment_id

### Data Flow

```
Sales Page (Form)
    ↓
POST /api/sales
    ↓
Create Sale + Line Items
    ↓
Auto-Create Consignment ← INTEGRATION POINT
    ↓
Update Customer Totals
    ↓
Return Success
    ↓
Show in Sales History
```

### Important Notes

**✅ SAFE OPERATIONS:**
- Auto-created consignments marked with "Auto-created from SALE-XX-XXX"
- Existing manually-added consignments are NOT affected
- All customer totals update correctly
- Payment tracking works as before

**⚠️ VALIDATIONS:**
- At least one line item required
- Payment split (RTGS + Cash) must equal Gross Total
- Customer must be selected
- Material type must be chosen

## 🎯 Use Cases

### 1. Regular Sales
Create sales with multiple materials:
- Granite slabs (500 sqft @ ₹150)
- Marble slabs (200 sqft @ ₹200)
- Add tax and charges
- Split payment as needed

### 2. Quick Sales
Single-item sales:
- One material type
- Simple calculations
- Direct to consignment

### 3. Complex Sales
Multiple items with charges:
- Various materials
- Tax, mining, loading fees
- Mixed payment modes

## 📈 Benefits

1. **Automated Workflow**: No need to manually create consignments after sales
2. **Accurate Tracking**: All sales data captured with line items
3. **Payment Management**: Built-in RTGS/Cash split tracking
4. **History**: Complete audit trail of all sales
5. **Integration**: Seamless connection to existing customer/consignment system

## 🔧 Technical Details

### Database Schema

**sales table:**
- `sale_number` (TEXT, UNIQUE) - e.g., "SALE-25-001"
- `customer_id` (UUID) → customers(id)
- `sale_date` (DATE)
- `total_slabs` (INTEGER) - Auto-calculated from items
- `total_sqft` (NUMERIC) - Auto-calculated from items
- `subtotal_amount` (NUMERIC) - Auto-calculated from items
- `tax_amount`, `mining_amount`, `loading_amount` (NUMERIC)
- `gross_total` (NUMERIC) - Auto-calculated on save
- `rtgs_expected`, `cash_expected` (NUMERIC)
- `remarks` (TEXT)
- `consignment_id` (UUID) → consignments(id)

**sale_items table:**
- `sale_id` (UUID) → sales(id) ON DELETE CASCADE
- `material_type_id` (UUID) → material_types(id)
- `material_name` (TEXT)
- `slabs_count` (INTEGER)
- `square_feet` (NUMERIC)
- `rate_per_sqft` (NUMERIC)
- `total_amount` (NUMERIC) = square_feet × rate_per_sqft

**material_types table:**
- `name` (TEXT, UNIQUE)
- `description` (TEXT)
- `is_active` (BOOLEAN)

### Triggers

1. **update_sales_summary** - Recalculates totals when items change
2. **update_sales_gross_total** - Recalculates gross total when charges change

### Functions

**generate_sale_number()** - Generates next sale number in format SALE-YY-NNN

## 🐛 Troubleshooting

### Issue: Material types not showing in dropdown
**Solution:** Run the migration - it inserts default material types

### Issue: Payment validation error
**Solution:** Ensure RTGS + Cash exactly equals Gross Total (to 2 decimal places)

### Issue: Consignment not created
**Check:**
- Supabase logs in dashboard
- API response in browser console
- Consignments table in database

### Issue: Sales page not appearing
**Solution:** Check that "Sales Management" is in sidebar and route `/sales` exists

## 📝 Next Steps

**Optional Enhancements:**
1. Edit/Delete sales functionality
2. Sales reports and analytics
3. Material type management (add/edit/deactivate)
4. Export sales to Excel
5. Link to production records
6. Customer-wise sales summary
7. Material-wise sales analysis

## ✅ Verification Checklist

- [ ] Database migration run successfully
- [ ] Material types showing in dropdown (5 types)
- [ ] Can create sale with single line item
- [ ] Can add/remove line items dynamically
- [ ] Totals calculate correctly
- [ ] Payment validation working
- [ ] Consignment auto-created
- [ ] Customer totals updated
- [ ] Sales appear in history table
- [ ] Toast notification showing
- [ ] Sidebar navigation working

## 🎊 You're Ready!

Your Sales Management feature is fully implemented and ready to use. The system will now automatically create consignments when you record sales, saving time and ensuring accuracy.

**Key Remember:**
- Always verify payment split equals gross total
- Consignments are automatically linked
- Sales history provides full audit trail
- Existing data remains untouched

Happy selling! 🚀
