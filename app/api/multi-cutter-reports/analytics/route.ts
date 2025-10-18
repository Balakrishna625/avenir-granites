import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");

  try {
    // Build date filter based on parameters
    let dateFilter = "";
    const params: any[] = [];
    
    if (month && year) {
      // Filter by specific month and year
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      dateFilter = "date >= $1 AND date <= $2";
      params.push(startDate, endDate);
    } else if (from && to) {
      // Filter by date range
      dateFilter = "date >= $1 AND date <= $2";
      params.push(from, to);
    } else if (from) {
      dateFilter = "date >= $1";
      params.push(from);
    } else if (to) {
      dateFilter = "date <= $1";
      params.push(to);
    }

    // Get summary statistics
    let summaryQuery = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT date) as total_days,
        COUNT(DISTINCT machine) as active_machines,
        SUM(total_slabs) as total_slabs,
        SUM(total_sqft) as total_sqft,
        AVG(total_slabs) as avg_slabs_per_entry,
        AVG(total_sqft) as avg_sqft_per_entry
      FROM multi_cutter_reports
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
    `;

    const { data: summary, error: summaryError } = await supabaseAdmin.rpc('execute_sql', {
      query: summaryQuery,
      params
    });

    if (summaryError) {
      console.error("Summary query error:", summaryError);
    }

    // Get machine-wise breakdown
    let machineQuery = `
      SELECT 
        machine,
        COUNT(*) as entries,
        SUM(total_slabs) as slabs,
        SUM(total_sqft) as sqft,
        AVG(total_slabs) as avg_slabs,
        AVG(total_sqft) as avg_sqft,
        COUNT(DISTINCT date) as working_days
      FROM multi_cutter_reports
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      GROUP BY machine
      ORDER BY machine
    `;

    const { data: machineBreakdown, error: machineError } = await supabaseAdmin.rpc('execute_sql', {
      query: machineQuery,
      params
    });

    if (machineError) {
      console.error("Machine query error:", machineError);
    }

    // Get daily trends (aggregated across all machines)
    let dailyQuery = `
      SELECT 
        date,
        COUNT(*) as machines_active,
        SUM(total_slabs) as slabs,
        SUM(total_sqft) as sqft
      FROM multi_cutter_reports
      ${dateFilter ? `WHERE ${dateFilter}` : 'WHERE date >= CURRENT_DATE - INTERVAL \'30 days\''}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `;

    const { data: dailyTrends, error: dailyError } = await supabaseAdmin.rpc('execute_sql', {
      query: dailyQuery,
      params: dateFilter ? params : []
    });

    if (dailyError) {
      console.error("Daily query error:", dailyError);
    }

    // Get material type breakdown (extract from JSONB blocks array)
    let materialQuery = `
      SELECT 
        block->>'material_type' as material_type,
        COUNT(*) as block_count,
        SUM((block->>'slabs')::integer) as total_slabs,
        SUM((block->>'sqft')::numeric) as total_sqft
      FROM multi_cutter_reports,
           jsonb_array_elements(blocks) as block
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      GROUP BY block->>'material_type'
      ORDER BY total_sqft DESC
    `;

    const { data: materialBreakdown, error: materialError } = await supabaseAdmin.rpc('execute_sql', {
      query: materialQuery,
      params
    });

    if (materialError) {
      console.error("Material query error:", materialError);
    }

    // Get top performing blocks
    let topBlocksQuery = `
      SELECT 
        block->>'block_name' as block_name,
        block->>'material_type' as material_type,
        COUNT(*) as times_processed,
        SUM((block->>'slabs')::integer) as total_slabs,
        SUM((block->>'sqft')::numeric) as total_sqft
      FROM multi_cutter_reports,
           jsonb_array_elements(blocks) as block
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      GROUP BY block->>'block_name', block->>'material_type'
      ORDER BY total_sqft DESC
      LIMIT 10
    `;

    const { data: topBlocks, error: topBlocksError } = await supabaseAdmin.rpc('execute_sql', {
      query: topBlocksQuery,
      params
    });

    if (topBlocksError) {
      console.error("Top blocks query error:", topBlocksError);
    }

    return NextResponse.json({
      summary: summary?.[0] || {},
      machine_breakdown: machineBreakdown || [],
      daily_trends: dailyTrends || [],
      material_breakdown: materialBreakdown || [],
      top_blocks: topBlocks || []
    });

  } catch (error: any) {
    console.error("Error in GET /api/multi-cutter-reports/analytics:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch analytics",
        summary: {},
        machine_breakdown: [],
        daily_trends: [],
        material_breakdown: [],
        top_blocks: []
      },
      { status: 500 }
    );
  }
}
