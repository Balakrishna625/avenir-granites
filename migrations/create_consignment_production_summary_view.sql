    -- ============================================================================
-- CONSIGNMENT PRODUCTION SUMMARY VIEW
-- ============================================================================
-- This creates a view that consolidates production data from multi_cutter_reports
-- and line_polish_reports, linking them back to granite_consignments and granite_blocks
-- 
-- Purpose: Track how much SqFt is produced from each block in a consignment,
--          including individual parts (A, B, C, etc.)
-- ============================================================================

-- PREREQUISITE: Run 00_prerequisite_add_activities_column.sql FIRST
-- That migration adds the 'activities' JSONB column to line_polish_reports
-- ============================================================================

-- First, create a helper function to extract the base block name
    -- Example: "AVG-1A" -> "AVG-1", "AVG-12B" -> "AVG-12"
    CREATE OR REPLACE FUNCTION extract_base_block_name(block_name TEXT)
    RETURNS TEXT AS $$
    BEGIN
    -- Remove trailing letter part (A, B, C, D, etc.)
    -- Match pattern: anything ending with a single uppercase letter
    RETURN REGEXP_REPLACE(block_name, '[A-Z]$', '');
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    -- ============================================================================
    -- VIEW: consignment_block_production_summary
    -- ============================================================================
    -- This view aggregates production data at the block level, showing:
    -- - All blocks in each consignment
    -- - Parts produced from each block (A, B, C, etc.)
    -- - SqFt produced from each part
    -- - Total SqFt per block
    -- - Source (multi_cutter, line_polish, or both)
    -- ============================================================================

    CREATE OR REPLACE VIEW consignment_block_production_summary AS
    WITH 
    -- Extract multi-cutter production data
    multi_cutter_data AS (
    SELECT 
        block->>'block_name' AS full_block_name,
        extract_base_block_name(block->>'block_name') AS base_block_name,
        RIGHT(block->>'block_name', 1) AS part_letter, -- Extract last character (A, B, C)
        (block->>'sqft')::numeric AS sqft,
        (block->>'slabs')::integer AS slabs,
        block->>'material_type' AS material_type,
        date AS production_date,
        'multi_cutter' AS source
    FROM 
        multi_cutter_reports,
        jsonb_array_elements(blocks) AS block
    WHERE 
        block->>'block_name' IS NOT NULL
        AND block->>'block_name' != ''
    ),

    -- Extract line-polish production data
    -- Now that activities column is guaranteed to exist and be JSONB
    line_polish_data AS (
    SELECT 
        (activity::jsonb)->>'block_name' AS full_block_name,
        extract_base_block_name((activity::jsonb)->>'block_name') AS base_block_name,
        RIGHT((activity::jsonb)->>'block_name', 1) AS part_letter,
        ((activity::jsonb)->>'sqft')::numeric AS sqft,
        ((activity::jsonb)->>'slabs')::integer AS slabs,
        (activity::jsonb)->>'activity' AS activity_type,
        date AS production_date,
        'line_polish' AS source
    FROM 
        line_polish_reports
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE 
                WHEN jsonb_typeof(line_polish_reports.activities) = 'array' 
                THEN line_polish_reports.activities
                ELSE '[]'::jsonb
            END
        ) AS activity
    WHERE 
        (activity::jsonb)->>'block_name' IS NOT NULL
        AND (activity::jsonb)->>'block_name' != ''
    ),

    -- Combine both sources
    all_production AS (
    SELECT * FROM multi_cutter_data
    UNION ALL
    SELECT 
        full_block_name,
        base_block_name,
        part_letter,
        sqft,
        slabs,
        activity_type AS material_type,
        production_date,
        source
    FROM line_polish_data
    ),

    -- Aggregate by block and part
    block_part_aggregation AS (
    SELECT 
        base_block_name,
        part_letter,
        SUM(sqft) AS total_sqft,
        SUM(slabs) AS total_slabs,
        array_agg(DISTINCT source) AS sources,
        MIN(production_date) AS first_production_date,
        MAX(production_date) AS last_production_date,
        COUNT(*) AS production_entries
    FROM 
        all_production
    WHERE
        base_block_name IS NOT NULL 
        AND base_block_name != ''
    GROUP BY 
        base_block_name, 
        part_letter
    ),

    -- Get block-level totals
    block_totals AS (
    SELECT 
        base_block_name,
        SUM(total_sqft) AS block_total_sqft,
        SUM(total_slabs) AS block_total_slabs,
        COUNT(DISTINCT part_letter) AS number_of_parts,
        array_agg(DISTINCT part_letter ORDER BY part_letter) AS parts_list
    FROM 
        block_part_aggregation
    GROUP BY 
        base_block_name
    )

    -- Final view joining with granite_blocks and granite_consignments
    SELECT 
    gc.id AS consignment_id,
    gc.consignment_number,
    gc.supplier_id,
    gc.arrival_date,
    gb.id AS block_id,
    gb.block_no,
    gb.grade,
    gb.gross_measurement,
    gb.net_measurement,
    gb.status AS block_status,
    -- Production data
    COALESCE(bt.block_total_sqft, 0) AS total_sqft_produced,
    COALESCE(bt.block_total_slabs, 0) AS total_slabs_produced,
    COALESCE(bt.number_of_parts, 0) AS number_of_parts,
    bt.parts_list,
    -- Part-level details as JSONB array
    COALESCE(
        (SELECT jsonb_agg(
        jsonb_build_object(
            'part', bpa.part_letter,
            'sqft', bpa.total_sqft,
            'slabs', bpa.total_slabs,
            'sources', bpa.sources,
            'first_production_date', bpa.first_production_date,
            'last_production_date', bpa.last_production_date,
            'production_entries', bpa.production_entries
        ) ORDER BY bpa.part_letter
        )
        FROM block_part_aggregation bpa
        WHERE bpa.base_block_name = gb.block_no),
        '[]'::jsonb
    ) AS parts_details,
    -- Calculate production efficiency
    CASE 
        WHEN gb.gross_measurement > 0 THEN 
        ROUND((COALESCE(bt.block_total_sqft, 0) / (gb.gross_measurement * 300)) * 100, 2)
        ELSE 0
    END AS production_efficiency_percentage,
    -- Expected vs actual
    ROUND(gb.gross_measurement * 300, 2) AS expected_sqft,
    ROUND(COALESCE(bt.block_total_sqft, 0) - (gb.gross_measurement * 300), 2) AS sqft_variance
    FROM 
    granite_consignments gc
    INNER JOIN granite_blocks gb ON gc.id = gb.consignment_id
    LEFT JOIN block_totals bt ON gb.block_no = bt.base_block_name
    ORDER BY 
    gc.arrival_date DESC,
    gc.consignment_number,
    gb.block_no;

    -- ============================================================================
    -- VIEW: consignment_production_summary
    -- ============================================================================
    -- Aggregate view at the consignment level
    -- ============================================================================

    CREATE OR REPLACE VIEW consignment_production_summary AS
    SELECT 
    consignment_id,
    consignment_number,
    supplier_id,
    arrival_date,
    COUNT(block_id) AS total_blocks,
    COUNT(block_id) FILTER (WHERE total_sqft_produced > 0) AS blocks_with_production,
    SUM(total_sqft_produced) AS consignment_total_sqft,
    SUM(total_slabs_produced) AS consignment_total_slabs,
    SUM(expected_sqft) AS consignment_expected_sqft,
    SUM(sqft_variance) AS consignment_sqft_variance,
    ROUND(AVG(production_efficiency_percentage), 2) AS avg_production_efficiency,
    -- Aggregate all parts across all blocks
    jsonb_agg(
        jsonb_build_object(
        'block_no', block_no,
        'block_id', block_id,
        'total_sqft', total_sqft_produced,
        'total_slabs', total_slabs_produced,
        'number_of_parts', number_of_parts,
        'parts_list', parts_list,
        'parts_details', parts_details,
        'expected_sqft', expected_sqft,
        'efficiency_percentage', production_efficiency_percentage
        ) ORDER BY block_no
    ) AS blocks_details
    FROM 
    consignment_block_production_summary
    GROUP BY 
    consignment_id,
    consignment_number,
    supplier_id,
    arrival_date
    ORDER BY 
    arrival_date DESC,
    consignment_number;

    -- ============================================================================
    -- INDEXES for performance
    -- ============================================================================

    -- Index on block_no for faster joins
    CREATE INDEX IF NOT EXISTS idx_granite_blocks_block_no ON granite_blocks(block_no);

    -- Index on consignment_id for faster aggregation
    CREATE INDEX IF NOT EXISTS idx_granite_blocks_consignment_id_block_no ON granite_blocks(consignment_id, block_no);

    -- ============================================================================
    -- COMMENTS for documentation
    -- ============================================================================

    COMMENT ON FUNCTION extract_base_block_name(TEXT) IS 
    'Extracts the base block name from a full block name with part letter. Example: AVG-1A -> AVG-1';

    COMMENT ON VIEW consignment_block_production_summary IS 
    'Detailed view showing production data for each block in each consignment, including part-level breakdowns';

    COMMENT ON VIEW consignment_production_summary IS 
    'Aggregated view showing total production statistics at the consignment level';
