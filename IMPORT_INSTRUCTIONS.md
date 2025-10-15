# Line Polish Data Import Instructions

## 🎯 Purpose
Import historical line polish data from Excel files into the database.

## 📍 Access
Navigate to: **http://localhost:3000/production/line-polish/import**

## 📝 Features

### 1. **Excel File Upload**
- Supports .xlsx and .xls files
- Automatically parses Excel data
- No copy-paste needed!

### 2. **Smart Parsing Logic**
- **Shift A** → Morning Shift + Polishing Activity
- **Shift B** → Night Shift + Polishing Activity  
- **Shift G** → Morning Shift + Grinding Activity (treats G as grinding in morning)
- Extracts opening balances from headers
- Parses credits as payment records

### 3. **Preview Before Import**
- Shows all parsed reports
- Shows all parsed payments
- Shows opening balances
- Review everything before importing

### 4. **Clear All Data**
- Button to delete ALL line polish data
- Double confirmation required
- Clears reports, payments, and monthly balances

## 🚀 How to Use

### Step 1: Clear Existing Data (if needed)
1. Click "Clear All Data" button (RED)
2. Confirm twice
3. Wait for success message

### Step 2: Upload Excel File
1. Click "Choose Excel File"
2. Select your Excel file
3. System automatically parses it
4. Review the preview tables

### Step 3: Import Data
1. Check the parsed data looks correct
2. Click "Import All Data" (GREEN)
3. Wait for success message
4. Redirects to Line Polish page

## 📊 What Gets Imported

From your Excel file, the system imports:

1. **Opening Balances**
   - Extracted from header rows
   - Example: "OPENING BALANCE(JUL-25 MONTH BALANCE DUE) 3500"

2. **Reports (Work Done)**
   - Date, Shift, Activity
   - Workers, Slabs, Square Feet
   - Hours, Rate, Debit Amount
   - Remarks

3. **Payments (Credits)**
   - Any credit column values
   - Converted to payment records
   - Default method: CASH

## ⚙️ Technical Details

### Date Format Support
- Handles: 1.09.25, 01.09.25, 1.9.25
- Converts to: 2025-09-01

### Shift & Activity Logic
```
A → MORNING + POLISHING
B → NIGHT + POLISHING
G → MORNING + GRINDING (fixed!)
```

### API Endpoints Used
- POST `/api/line-polish-reports/bulk` - Bulk import reports
- POST `/api/line-polish-payments/bulk` - Bulk import payments
- POST `/api/line-polish-monthly-balances` - Set opening balances
- DELETE `/api/line-polish-reports/clear-all` - Clear all data

## ⚠️ Important Notes

1. **Shift B Issue Fixed**: Now properly imports Night shift data
2. **G = Grinding**: Always treated as Morning Grinding
3. **Clear Data**: Use with caution - cannot be undone!
4. **Monthly Balances**: Automatically calculated after import

## 🎉 Success Indicators

- Preview tables show correct number of records
- Morning and Night shifts both appear
- Grinding activities marked correctly
- Opening balances extracted
- Import completes without errors
