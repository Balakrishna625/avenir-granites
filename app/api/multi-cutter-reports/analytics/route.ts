import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");

  console.log("📊 Analytics API called with:", { from, to, month, year });

  try {
    // Calculate date range
    let startDate: string | null = null;
    let endDate: string | null = null;
    
    if (month && year) {
      startDate = `${year}-${month.padStart(2, '0')}-01`;
      const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
      const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
      const lastDay = new Date(nextYear, nextMonth - 1, 0).getDate();
      endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
    } else if (from || to) {
      startDate = from;
      endDate = to;
    }

    console.log("📅 Date range:", { startDate, endDate });

    // Fetch all reports with date filtering
    let query = supabaseAdmin.from('multi_cutter_reports').select('*');
    
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    
    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      console.error("❌ Error fetching reports:", reportsError);
      throw reportsError;
    }

    console.log(`✅ Fetched ${reports?.length || 0} reports`);

    // Process data in JavaScript instead of using SQL functions
    const allReports = reports || [];

    // Calculate summary statistics
    const uniqueDates = new Set(allReports.map(r => r.date));
    const uniqueMachines = new Set(allReports.map(r => r.machine));
    const totalSlabs = allReports.reduce((sum, r) => sum + (r.total_slabs || 0), 0);
    const totalSqft = allReports.reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);

    const summary = {
      total_entries: allReports.length,
      total_days: uniqueDates.size,
      active_machines: uniqueMachines.size,
      total_slabs: totalSlabs,
      total_sqft: totalSqft,
      avg_slabs_per_entry: allReports.length > 0 ? totalSlabs / allReports.length : 0,
      avg_sqft_per_entry: allReports.length > 0 ? totalSqft / allReports.length : 0
    };

    console.log("📊 Summary:", summary);

    // Calculate machine-wise breakdown
    const machineMap = new Map<string, any>();
    allReports.forEach(report => {
      if (!machineMap.has(report.machine)) {
        machineMap.set(report.machine, {
          machine: report.machine,
          entries: 0,
          slabs: 0,
          sqft: 0,
          working_days: new Set()
        });
      }
      const machine = machineMap.get(report.machine)!;
      machine.entries++;
      machine.slabs += report.total_slabs || 0;
      machine.sqft += Number(report.total_sqft) || 0;
      machine.working_days.add(report.date);
    });

    const machineBreakdown = Array.from(machineMap.values()).map(m => ({
      machine: m.machine,
      entries: m.entries,
      slabs: m.slabs,
      sqft: m.sqft,
      avg_slabs: m.entries > 0 ? m.slabs / m.entries : 0,
      avg_sqft: m.entries > 0 ? m.sqft / m.entries : 0,
      working_days: m.working_days.size
    })).sort((a, b) => a.machine.localeCompare(b.machine));

    console.log("🏭 Machine breakdown:", machineBreakdown);

    // Calculate daily trends
    const dailyMap = new Map<string, any>();
    allReports.forEach(report => {
      if (!dailyMap.has(report.date)) {
        dailyMap.set(report.date, {
          date: report.date,
          machines_active: new Set(),
          slabs: 0,
          sqft: 0,
          notes: [] // Collect all notes from blocks on this day
        });
      }
      const daily = dailyMap.get(report.date)!;
      daily.machines_active.add(report.machine);
      daily.slabs += report.total_slabs || 0;
      daily.sqft += Number(report.total_sqft) || 0;
      
      // Collect notes from blocks
      const blocks = report.blocks || [];
      blocks.forEach((block: any) => {
        if (block.notes && block.notes.trim()) {
          daily.notes.push(block.notes.trim());
        }
      });
    });

    const dailyTrends = Array.from(dailyMap.values())
      .map(d => ({
        date: d.date,
        machines_active: d.machines_active.size,
        slabs: d.slabs,
        sqft: d.sqft,
        notes: d.notes // Include notes in the output
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    console.log(`📈 Daily trends (${dailyTrends.length} days)`);

    // Calculate material breakdown from JSONB blocks
    const materialMap = new Map<string, any>();
    allReports.forEach(report => {
      const blocks = report.blocks || [];
      blocks.forEach((block: any) => {
        const material = block.material_type || 'Unknown';
        if (!materialMap.has(material)) {
          materialMap.set(material, {
            material_type: material,
            block_count: 0,
            total_slabs: 0,
            total_sqft: 0
          });
        }
        const mat = materialMap.get(material)!;
        mat.block_count++;
        mat.total_slabs += Number(block.slabs) || 0;
        mat.total_sqft += Number(block.sqft) || 0;
      });
    });

    const materialBreakdown = Array.from(materialMap.values())
      .sort((a, b) => b.total_sqft - a.total_sqft);

    console.log("🎨 Material breakdown:", materialBreakdown);

    // Calculate top blocks
    const blockMap = new Map<string, any>();
    allReports.forEach(report => {
      const blocks = report.blocks || [];
      blocks.forEach((block: any) => {
        const key = `${block.block_name}|${block.material_type}`;
        if (!blockMap.has(key)) {
          blockMap.set(key, {
            block_name: block.block_name,
            material_type: block.material_type,
            times_processed: 0,
            total_slabs: 0,
            total_sqft: 0,
            production_entries: []
          });
        }
        const b = blockMap.get(key)!;
        b.times_processed++;
        b.total_slabs += Number(block.slabs) || 0;
        b.total_sqft += Number(block.sqft) || 0;
        b.production_entries.push({
          date: report.date,
          sqft: Number(block.sqft) || 0,
          slabs: Number(block.slabs) || 0
        });
      });
    });

    const topBlocks = Array.from(blockMap.values())
      .sort((a, b) => b.total_sqft - a.total_sqft);
      // Return all blocks, let frontend decide how many to show

    console.log(`🏆 Top blocks (${topBlocks.length})`);

    return NextResponse.json({
      summary,
      machine_breakdown: machineBreakdown,
      daily_trends: dailyTrends,
      material_breakdown: materialBreakdown,
      top_blocks: topBlocks
    });

  } catch (error: any) {
    console.error("❌ Error in GET /api/multi-cutter-reports/analytics:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch analytics",
        summary: {
          total_entries: 0,
          total_days: 0,
          active_machines: 0,
          total_slabs: 0,
          total_sqft: 0,
          avg_slabs_per_entry: 0,
          avg_sqft_per_entry: 0
        },
        machine_breakdown: [],
        daily_trends: [],
        material_breakdown: [],
        top_blocks: []
      },
      { status: 500 }
    );
  }
}
