# Consignment Net Measurement Update - Implementation Plan

## Summary of Changes

### What's Changing:
1. **Net Measurement** moves from individual blocks to consignment level (single value for all blocks)
2. **Gross Measurement** stays at block level (filled when blocks reach factory)
3. **Purchase Cost** becomes auto-calculated: Net × Rate (21000 for Gokanakonda, 18000 for others)

### Business Logic:
- **Gokanakonda quarry**: Purchase Cost = Net Measurement × ₹21,000
- **Other quarries** (Sai lakshmi, Sambrajyam, Burgandy, Ummadivaram): Purchase Cost = Net Measurement × ₹18,000

## Database Changes

### Migration File: `migrations/update_consignment_net_measurement.sql`

1. **Add `net_measurement` column** to `granite_consignments` (single value for all blocks)
2. **Add `purchase_cost_rate` column** to `granite_consignments` (21000 or 18000 based on quarry)
3. **Deprecate `net_measurement` on `granite_blocks`** (keep for backward compatibility, don't drop)
4. **Create trigger** to auto-calculate `purchase_cost` when net_measurement or rate changes
5. **Migrate existing data** from block-level net to consignment-level net

### Safety Features:
- Uses `IF NOT EXISTS` checks (safe to re-run)
- Doesn't drop columns (no data loss)
- Migrates existing data automatically
- Creates triggers for auto-calculation

## UI Changes

### Consignment Details Page (`app/consignments/details/page.tsx`)

**BEFORE:**
```
Block Details:
[AVG-1] Net: 2.5m  Gross: 3.0m [Remove]
[AVG-2] Net: 2.3m  Gross: 2.8m [Remove]
[AVG-3] Net: 2.7m  Gross: 3.2m [Remove]

Cost Details:
Purchase Cost: ₹150,000 (manual entry)
```

**AFTER:**
```
Consignment Details:
Quarry: Gokanakonda
Net Measurement: 7.5m (single input)
Purchase Cost: ₹157,500 (auto-calculated: 7.5 × 21,000)

Block Details:
[AVG-1] Gross: 3.0m [Remove]
[AVG-2] Gross: 2.8m [Remove]
[AVG-3] Gross: 3.2m [Remove]
```

### Changes to Block Rows:
1. **Remove** Net Measurement column from block table
2. **Keep** Gross Measurement column in block table
3. **Add** Net Measurement field at consignment level (above blocks)
4. **Display** Purchase Cost Rate based on selected quarry
5. **Auto-calculate** Purchase Cost (read-only display)

## API Changes

### `app/api/consignments-new/route.ts`

**POST/PUT Request Body Changes:**
```typescript
{
  purchase_date: string,
  quarry_name: string,
  net_measurement: number,  // NEW: single value for all blocks
  // REMOVED: purchase_cost (now auto-calculated)
  transport_cost: number,
  loading_cost: number,
  quarry_commission: number,
  other_charges: number,
  blocks: [
    {
      block_name: string,
      // REMOVED: net_measurement from blocks
      gross_measurement: number  // KEEP: per block
    }
  ]
}
```

### Backend Logic:
1. Calculate `purchase_cost_rate` based on `quarry_name`
2. Let database trigger calculate `purchase_cost` automatically
3. Don't send `purchase_cost` in request (it's computed)
4. Don't send `net_measurement` for individual blocks

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create new consignment with Gokanakonda quarry
- [ ] Verify purchase cost = net × 21,000
- [ ] Create new consignment with other quarry
- [ ] Verify purchase cost = net × 18,000
- [ ] Edit existing consignment
- [ ] Change quarry and verify rate updates
- [ ] Change net measurement and verify cost updates
- [ ] Verify existing consignments still display correctly
- [ ] Check consignment analytics page
- [ ] Verify blocks don't have net measurement in UI

## Rollback Plan

If issues occur:
1. The migration doesn't drop any columns
2. Block-level `net_measurement` column still exists (deprecated)
3. Can revert UI changes without data loss
4. Can manually update `purchase_cost` if trigger fails

## Files to Modify

1. ✅ `migrations/update_consignment_net_measurement.sql` (CREATED)
2. ⏳ `app/consignments/details/page.tsx` (UPDATE UI)
3. ⏳ `app/api/consignments-new/route.ts` (UPDATE API)
4. ⏳ TypeScript interfaces (UPDATE types)

## Notes

- **Backward Compatible**: Old consignments will have sum of block nets migrated to consignment net
- **No Data Loss**: Block net_measurement column kept but marked deprecated
- **Auto-Calculation**: Purchase cost updates automatically when net or quarry changes
- **Rate Logic**: Gokanakonda = 21,000, Others = 18,000 (configurable in migration)
