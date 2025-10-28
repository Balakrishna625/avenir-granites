-- ============================================================================
-- CHECK EXISTING PRODUCTION DATA
-- ============================================================================
-- Run this in Supabase SQL Editor to see what data you currently have
-- ============================================================================

-- 1. Check Multi-Cutter data structure
SELECT 
    '=== MULTI-CUTTER DATA SAMPLE ===' as info;

SELECT 
    date,
    machine,
    blocks,
    jsonb_array_length(blocks) as blocks_count
FROM multi_cutter_reports
ORDER BY date DESC
LIMIT 3;

-- 2. Check if block_name field exists in multi-cutter blocks
SELECT 
    '=== CHECKING FOR block_name IN MULTI-CUTTER ===' as info;

SELECT 
    date,
    machine,
    block->>'block_name' as block_name,
    block->>'material_type' as material_type,
    block->>'slabs' as slabs,
    block->>'sqft' as sqft
FROM 
    multi_cutter_reports,
    jsonb_array_elements(blocks) as block
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
LIMIT 10;

-- 3. Check Line-Polish data structure
SELECT 
    '=== LINE-POLISH DATA SAMPLE ===' as info;

SELECT 
    date,
    shift,
    activities,
    pg_typeof(activities) as activities_type,
    jsonb_array_length(COALESCE(activities, '[]'::jsonb)) as activities_count
FROM line_polish_reports
ORDER BY date DESC
LIMIT 3;

-- 4. Check if block_name field exists in line-polish activities
SELECT 
    '=== CHECKING FOR block_name IN LINE-POLISH ===' as info;

SELECT 
    date,
    shift,
    elem->>'block_name' as block_name,
    elem->>'activity' as activity_type,
    elem->>'slabs' as slabs,
    elem->>'sqft' as sqft
FROM 
    line_polish_reports,
    LATERAL (
        SELECT jsonb_array_elements(
            CASE 
                WHEN activities IS NOT NULL AND jsonb_typeof(activities) = 'array' 
                THEN activities
                ELSE '[]'::jsonb
            END
        ) as elem
    ) elements
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
LIMIT 10;

-- 5. Summary Report
SELECT 
    '=== SUMMARY ===' as info;

SELECT 
    'Multi-Cutter Reports' as source,
    COUNT(*) as total_reports,
    COUNT(CASE WHEN jsonb_array_length(blocks) > 0 THEN 1 END) as reports_with_blocks
FROM multi_cutter_reports

UNION ALL

SELECT 
    'Line-Polish Reports' as source,
    COUNT(*) as total_reports,
    COUNT(CASE WHEN jsonb_array_length(COALESCE(activities, '[]'::jsonb)) > 0 THEN 1 END) as reports_with_activities
FROM line_polish_reports;

-- 6. Check what fields ARE in your existing blocks JSONB
SELECT 
    '=== EXISTING FIELDS IN MULTI-CUTTER BLOCKS ===' as info;

SELECT DISTINCT
    jsonb_object_keys(block) as field_name
FROM 
    multi_cutter_reports,
    jsonb_array_elements(blocks) as block
LIMIT 20;

-- 7. Check what fields ARE in your existing activities JSONB
SELECT 
    '=== EXISTING FIELDS IN LINE-POLISH ACTIVITIES ===' as info;

SELECT DISTINCT
    jsonb_object_keys(elem) as field_name
FROM 
    line_polish_reports,
    LATERAL (
        SELECT jsonb_array_elements(
            CASE 
                WHEN activities IS NOT NULL AND jsonb_typeof(activities) = 'array' 
                THEN activities
                ELSE '[]'::jsonb
            END
        ) as elem
    ) elements
LIMIT 20;
