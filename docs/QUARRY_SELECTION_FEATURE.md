# Quarry Selection Feature - Implementation Summary

## Overview
Added a quarry selection feature to the consignment calculator that allows choosing between three quarries, each with different pricing structures.

## Changes Made

### 1. Database Schema (`migrations/add_quarry_and_amr_charges_to_consignment_calculations.sql`)
- Added `quarry` column (text, NOT NULL, default: 'Sambrajyam')
  - Constraint: Must be one of: 'Sambrajyam', 'Sai Lakshmi', 'Gokana Konda'
- Added `amr_charges` column (numeric(10,2), default: 0)
  - Only applicable for Gokana Konda quarry
  - Constraint: Must be >= 0

### 2. TypeScript Interface (`app/consignments/calculator/page.tsx`)
Updated `ConsignmentCalculation` interface:
```typescript
interface ConsignmentCalculation {
  // ... existing fields
  quarry: 'Sambrajyam' | 'Sai Lakshmi' | 'Gokana Konda'; // NEW
  amr_charges: number; // NEW - Only for Gokana Konda
  // ... rest of fields
}
```

### 3. Pricing Logic

#### Sambrajyam & Sai Lakshmi (Default)
- **Transport Charges**: ₹4,500 per block (auto-calculated)
- **Loading Charges**: ₹1,500 per block (auto-calculated)
- **AMR Charges**: N/A (field hidden)

#### Gokana Konda
- **Transport Charges**: ₹10,000 per block (auto-calculated)
- **Loading Charges**: ₹1,000 per block (auto-calculated)
- **AMR Charges**: Manual entry required (additional field)

### 4. Manual Override Capability
- **Transport Charges**: Can be manually overridden for all quarries
  - Reset button to return to auto-calculated value
  - Shows both current value and what auto-calculated would be
- **Loading Charges**: Can be manually overridden for all quarries
  - Reset button to return to auto-calculated value
  - Shows both current value and what auto-calculated would be

### 5. UI Components Added

#### Quarry Dropdown
- Location: After "Description" field in the form
- Shows pricing hint below dropdown:
  - "₹4,500/block transport + ₹1,500/block loading" (Sambrajyam/Sai Lakshmi)
  - "₹10,000/block transport + ₹1,000/block loading + AMR charges" (Gokana Konda)

#### AMR Charges Field
- Only visible when "Gokana Konda" is selected
- Numeric input with validation (must be >= 0)
- Helper text: "Additional charges specific to Gokana Konda quarry"

#### Transport Charges Section
- Updated to show manual override option (similar to loading charges)
- Displays quarry-specific rates in auto-calculation mode
- Shows "Reset to Auto" button in manual mode with current quarry rate

### 6. Auto-Calculation Logic
Two new `useEffect` hooks:

```typescript
// Loading charges auto-calculation
useEffect(() => {
  if (!isLoadingChargesManual && currentCalculation.total_blocks > 0) {
    let autoLoadingCharges = 0;
    if (currentCalculation.quarry === 'Gokana Konda') {
      autoLoadingCharges = currentCalculation.total_blocks * 1000;
    } else {
      autoLoadingCharges = currentCalculation.total_blocks * 1500;
    }
    setCurrentCalculation(prev => ({ ...prev, loading_charges: autoLoadingCharges }));
  }
}, [currentCalculation.total_blocks, currentCalculation.quarry, isLoadingChargesManual]);

// Transport charges auto-calculation
useEffect(() => {
  if (!isTransportChargesManual && currentCalculation.total_blocks > 0) {
    let autoTransportCharges = 0;
    if (currentCalculation.quarry === 'Gokana Konda') {
      autoTransportCharges = currentCalculation.total_blocks * 10000;
    } else {
      autoTransportCharges = currentCalculation.total_blocks * 4500;
    }
    setCurrentCalculation(prev => ({ ...prev, transport_charges: autoTransportCharges }));
  }
}, [currentCalculation.total_blocks, currentCalculation.quarry, isTransportChargesManual]);
```

### 7. Cost Calculation Updates

Updated `calculateDerivedValues` function:
```typescript
// Now uses actual transport_charges from state (not hardcoded)
const transportCharges = calc.transport_charges || 0;
const loadingCharges = calc.loading_charges || 0;

// AMR charges only for Gokana Konda
const amrCharges = calc.quarry === 'Gokana Konda' ? (calc.amr_charges || 0) : 0;

// Raw material cost includes AMR charges
const rawMaterialCost = 
  (calc.total_blocks * calc.net_meters_per_block * calc.cost_per_meter) + 
  loadingCharges + transportCharges + calc.quarry_commission + amrCharges;
```

### 8. API Route Updates (`app/api/consignment-calculations/route.ts`)

#### POST Method
- Added `quarry` to required fields validation
- Added `amr_charges` to numeric fields validation
- Includes `quarry` and `amr_charges` in insert statement

#### PUT Method
- Added `amr_charges` to numeric fields validation
- Includes `amr_charges` in float fields processing

### 9. State Management
Added new state variable:
```typescript
const [isTransportChargesManual, setIsTransportChargesManual] = useState(false);
```

Updated `resetForm()` to reset both manual override flags:
```typescript
setIsLoadingChargesManual(false);
setIsTransportChargesManual(false);
```

### 10. Cost Breakdown Display
Updated raw material cost breakdown to show:
- Quarry-specific loading charges rate
- Quarry-specific transport charges rate
- AMR charges (only when Gokana Konda is selected and amr_charges > 0)

## Testing Required

### Before Running the Application
1. **Run the database migration in Supabase SQL Editor**:
   ```sql
   -- Copy and run: migrations/add_quarry_and_amr_charges_to_consignment_calculations.sql
   ```

### Test Scenarios

#### Test 1: Sambrajyam Quarry (Default)
1. Create new calculation
2. Select "Sambrajyam" quarry
3. Enter 10 blocks
4. Verify:
   - Loading charges = ₹15,000 (10 × ₹1,500)
   - Transport charges = ₹45,000 (10 × ₹4,500)
   - AMR charges field is hidden

#### Test 2: Sai Lakshmi Quarry
1. Create new calculation
2. Select "Sai Lakshmi" quarry
3. Enter 10 blocks
4. Verify:
   - Loading charges = ₹15,000 (10 × ₹1,500)
   - Transport charges = ₹45,000 (10 × ₹4,500)
   - AMR charges field is hidden

#### Test 3: Gokana Konda Quarry
1. Create new calculation
2. Select "Gokana Konda" quarry
3. Enter 10 blocks
4. Verify:
   - Loading charges = ₹10,000 (10 × ₹1,000)
   - Transport charges = ₹100,000 (10 × ₹10,000)
   - AMR charges field is visible
5. Enter AMR charges: ₹5,000
6. Verify raw material cost includes all charges

#### Test 4: Manual Override - Loading Charges
1. Create calculation with any quarry
2. Click "Override with Custom Amount" on loading charges
3. Enter custom amount: ₹20,000
4. Verify:
   - Shows "Manual Override" label
   - Shows "Reset to Auto" button with correct quarry rate
5. Click "Reset to Auto"
6. Verify loading charges return to auto-calculated value

#### Test 5: Manual Override - Transport Charges
1. Create calculation with any quarry
2. Click "Override with Custom Amount" on transport charges
3. Enter custom amount: ₹50,000
4. Verify:
   - Shows "Manual Override" label
   - Shows "Reset to Auto" button with correct quarry rate
5. Click "Reset to Auto"
6. Verify transport charges return to auto-calculated value

#### Test 6: Quarry Change with Manual Override
1. Create calculation with Sambrajyam
2. Enter 10 blocks
3. Manually override transport charges to ₹50,000
4. Change quarry to "Gokana Konda"
5. Verify:
   - Manual transport charges remain at ₹50,000 (override preserved)
   - Loading charges auto-update to ₹10,000 (if not manually overridden)
   - AMR charges field appears

#### Test 7: Save and Edit
1. Create calculation with Gokana Konda
2. Enter all details including AMR charges
3. Save calculation
4. Edit the same calculation
5. Verify:
   - Quarry selection is preserved
   - AMR charges value is preserved
   - All other fields are preserved

## Files Modified
1. `app/consignments/calculator/page.tsx` - Main component with quarry selection
2. `app/api/consignment-calculations/route.ts` - API route for CRUD operations
3. `migrations/add_quarry_and_amr_charges_to_consignment_calculations.sql` - Database schema update

## Git Commit
- Commit hash: bdd63fd
- Branch: main
- Status: Pushed to GitHub (avenir-granites repository)

## Next Steps
1. **Run the database migration** in Supabase SQL Editor
2. Test the feature with all three quarries
3. Verify calculations are correct with different pricing
4. Test manual override functionality
5. Ensure AMR charges only appear for Gokana Konda

## Notes
- Default quarry is "Sambrajyam" for backward compatibility
- Existing calculations will be updated to have "Sambrajyam" as default quarry
- AMR charges default to 0 for all existing calculations
- Manual override flags are reset when form is reset
- Quarry-specific pricing is automatically applied when quarry changes
