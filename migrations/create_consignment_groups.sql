-- ============================================================================
-- CONSIGNMENT GROUPS
-- ============================================================================
-- This creates tables to support grouping multiple consignments together
-- Purpose: Allow users to group related consignments (e.g., AVG-1, AVG-2, AVG-3)
--          and view their combined production summaries
-- ============================================================================

-- Create consignment_groups table
CREATE TABLE IF NOT EXISTS consignment_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for consignments in groups
CREATE TABLE IF NOT EXISTS consignment_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES consignment_groups(id) ON DELETE CASCADE,
    consignment_id UUID NOT NULL REFERENCES granite_consignments(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, consignment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consignment_group_members_group_id 
    ON consignment_group_members(group_id);
    
CREATE INDEX IF NOT EXISTS idx_consignment_group_members_consignment_id 
    ON consignment_group_members(consignment_id);

-- ============================================================================
-- VIEW: consignment_groups_summary
-- ============================================================================
-- Aggregates production data for all consignments in a group
-- ============================================================================

CREATE OR REPLACE VIEW consignment_groups_summary AS
SELECT 
    cg.id AS group_id,
    cg.group_name,
    cg.description,
    cg.created_at,
    COUNT(DISTINCT cgm.consignment_id) AS total_consignments,
    COUNT(DISTINCT cps.block_id) AS total_blocks,
    SUM(CASE WHEN cps.multi_cutter_sqft > 0 OR cps.line_polish_sqft > 0 THEN 1 ELSE 0 END) AS blocks_with_production,
    SUM(cps.multi_cutter_sqft) AS group_multi_cutter_sqft,
    SUM(cps.multi_cutter_slabs) AS group_multi_cutter_slabs,
    SUM(cps.line_polish_sqft) AS group_line_polish_sqft,
    SUM(cps.line_polish_slabs) AS group_line_polish_slabs,
    SUM(cps.expected_sqft) AS group_expected_sqft,
    SUM(cps.sqft_variance) AS group_sqft_variance,
    ROUND(AVG(cps.production_efficiency_percentage), 2) AS avg_production_efficiency,
    MIN(gc.arrival_date) AS earliest_arrival_date,
    MAX(gc.arrival_date) AS latest_arrival_date,
    -- Aggregate consignment details
    jsonb_agg(
        jsonb_build_object(
            'consignment_id', gc.id,
            'consignment_number', gc.consignment_number,
            'arrival_date', gc.arrival_date,
            'supplier_id', gc.supplier_id
        ) ORDER BY gc.arrival_date
    ) AS consignments_in_group
FROM 
    consignment_groups cg
    INNER JOIN consignment_group_members cgm ON cg.id = cgm.group_id
    INNER JOIN granite_consignments gc ON cgm.consignment_id = gc.id
    LEFT JOIN consignment_block_production_summary cps ON gc.id = cps.consignment_id
GROUP BY 
    cg.id, cg.group_name, cg.description, cg.created_at
ORDER BY 
    cg.group_name;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE consignment_groups IS 
'Defines groups of related consignments for combined tracking and analysis';

COMMENT ON TABLE consignment_group_members IS 
'Junction table linking consignments to their groups';

COMMENT ON VIEW consignment_groups_summary IS 
'Aggregated production summary for all consignments within each group';
