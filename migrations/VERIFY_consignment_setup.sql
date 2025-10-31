-- ============================================================================
-- VERIFICATION SCRIPT FOR CONSIGNMENT DETAILS FEATURE
-- ============================================================================
-- Run this after the migration to verify everything is set up correctly
-- ============================================================================

-- 1. Check if all new columns exist in granite_consignments
SELECT 
    'Checking new columns in granite_consignments...' as check_step;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'granite_consignments'
    AND column_name IN (
        'quarry_name',
        'purchase_date',
        'total_blocks_count',
        'purchase_cost',
        'loading_cost',
        'quarry_commission',
        'other_charges',
        'total_expenditure'
    )
ORDER BY column_name;

-- 2. Verify quarry suppliers exist
SELECT 
    '-- Checking quarry suppliers...' as check_step;

SELECT 
    id,
    name,
    contact_person,
    created_at
FROM granite_suppliers
WHERE name IN ('Sai lakshmi', 'Sambrajyam', 'Burgandy', 'Gokanakonda', 'Ummadivaram')
ORDER BY name;

-- 3. Check if indexes are created
SELECT 
    '-- Checking indexes...' as check_step;

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'granite_consignments'
    AND indexname IN (
        'idx_granite_consignments_purchase_date',
        'idx_granite_consignments_quarry_name'
    )
ORDER BY indexname;

-- 4. Check existing consignments data integrity
SELECT 
    '-- Checking existing consignments...' as check_step;

SELECT 
    COUNT(*) as total_consignments,
    COUNT(quarry_name) as consignments_with_quarry,
    COUNT(purchase_date) as consignments_with_purchase_date,
    COUNT(total_blocks_count) as consignments_with_block_count
FROM granite_consignments;

-- 5. Test query that the API will use
SELECT 
    '-- Testing API query structure...' as check_step;

SELECT 
    gc.id,
    gc.consignment_number,
    gc.quarry_name,
    gc.purchase_date,
    gc.total_blocks_count,
    gc.total_net_measurement,
    gc.total_gross_measurement,
    gc.purchase_cost,
    gc.transport_cost,
    gc.loading_cost,
    gc.quarry_commission,
    gc.other_charges,
    gc.total_expenditure,
    gs.name as supplier_name
FROM granite_consignments gc
LEFT JOIN granite_suppliers gs ON gc.supplier_id = gs.id
ORDER BY gc.purchase_date DESC NULLS LAST
LIMIT 5;

-- 6. Check blocks relationship
SELECT 
    '-- Testing blocks relationship...' as check_step;

SELECT 
    gc.consignment_number,
    COUNT(gb.id) as blocks_count,
    SUM(gb.net_measurement) as total_net,
    SUM(gb.gross_measurement) as total_gross
FROM granite_consignments gc
LEFT JOIN granite_blocks gb ON gb.consignment_id = gc.id
GROUP BY gc.id, gc.consignment_number
LIMIT 5;

-- 7. Final summary
SELECT 
    '============================================' as summary,
    'VERIFICATION COMPLETE!' as status,
    '============================================' as summary2;

SELECT 
    'Total Columns Added' as metric,
    COUNT(*) as value
FROM information_schema.columns
WHERE table_name = 'granite_consignments'
    AND column_name IN (
        'quarry_name', 'purchase_date', 'total_blocks_count',
        'purchase_cost', 'loading_cost', 'quarry_commission',
        'other_charges', 'total_expenditure'
    )
UNION ALL
SELECT 
    'Quarry Suppliers' as metric,
    COUNT(*) as value
FROM granite_suppliers
WHERE name IN ('Sai lakshmi', 'Sambrajyam', 'Burgandy', 'Gokanakonda', 'Ummadivaram')
UNION ALL
SELECT 
    'Indexes Created' as metric,
    COUNT(*) as value
FROM pg_indexes
WHERE tablename = 'granite_consignments'
    AND indexname IN (
        'idx_granite_consignments_purchase_date',
        'idx_granite_consignments_quarry_name'
    );

-- Expected Results:
-- - 8 new columns (including total_expenditure)
-- - 5 quarry suppliers
-- - 2 new indexes
