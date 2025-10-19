import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET - List all multi-cutter reports with optional date filtering
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const machine = url.searchParams.get("machine");

  console.log('🔍 GET /api/multi-cutter-reports called with params:', { from, to, machine });

  try {
    let query = supabaseAdmin
      .from("multi_cutter_reports")
      .select("*")
      .order("date", { ascending: false })
      .order("machine", { ascending: true });

    if (from) {
      console.log('  Adding from filter:', from);
      query = query.gte("date", from);
    }
    if (to) {
      console.log('  Adding to filter:', to);
      query = query.lte("date", to);
    }
    if (machine) {
      console.log('  Adding machine filter:', machine);
      query = query.eq("machine", machine);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase error fetching multi-cutter reports:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Supabase query successful - Retrieved', data?.length || 0, 'reports');
    if (data && data.length > 0) {
      console.log('📊 Sample report:', data[0]);
    } else {
      console.log('⚠️ No reports found in database');
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("❌ Error in GET /api/multi-cutter-reports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST - Create new multi-cutter report
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, machine, blocks, total_slabs, total_sqft } = body;

    // Validation
    if (!date || !machine || !blocks || !Array.isArray(blocks)) {
      return NextResponse.json(
        { error: "Missing required fields: date, machine, blocks" },
        { status: 400 }
      );
    }

    if (!["Machine-1", "Machine-2", "Machine-3"].includes(machine)) {
      return NextResponse.json(
        { error: "Invalid machine. Must be Machine-1, Machine-2, or Machine-3" },
        { status: 400 }
      );
    }

    // Calculate totals from blocks if not provided
    const calculatedTotalSlabs = blocks.reduce((sum, block) => sum + (block.slabs || 0), 0);
    const calculatedTotalSqft = blocks.reduce((sum, block) => sum + (block.sqft || 0), 0);

    const insertData = {
      date,
      machine,
      blocks,
      total_slabs: total_slabs !== undefined ? total_slabs : calculatedTotalSlabs,
      total_sqft: total_sqft !== undefined ? total_sqft : calculatedTotalSqft,
    };

    const { data, error } = await supabaseAdmin
      .from("multi_cutter_reports")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating multi-cutter report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/multi-cutter-reports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create report" },
      { status: 500 }
    );
  }
}

// PUT - Update existing multi-cutter report
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, date, machine, blocks, total_slabs, total_sqft } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    // Calculate totals from blocks if blocks are provided
    const updateData: any = {};
    
    if (date !== undefined) updateData.date = date;
    if (machine !== undefined) updateData.machine = machine;
    if (blocks !== undefined) {
      updateData.blocks = blocks;
      // Recalculate totals
      updateData.total_slabs = blocks.reduce((sum: number, block: any) => sum + (block.slabs || 0), 0);
      updateData.total_sqft = blocks.reduce((sum: number, block: any) => sum + (block.sqft || 0), 0);
    } else {
      if (total_slabs !== undefined) updateData.total_slabs = total_slabs;
      if (total_sqft !== undefined) updateData.total_sqft = total_sqft;
    }

    const { data, error } = await supabaseAdmin
      .from("multi_cutter_reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating multi-cutter report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in PUT /api/multi-cutter-reports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update report" },
      { status: 500 }
    );
  }
}

// DELETE - Delete multi-cutter report
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing required parameter: id" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabaseAdmin
      .from("multi_cutter_reports")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting multi-cutter report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/multi-cutter-reports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete report" },
      { status: 500 }
    );
  }
}
