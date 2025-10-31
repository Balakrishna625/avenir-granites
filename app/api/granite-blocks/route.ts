import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const consignmentId = url.searchParams.get("consignment_id");
    const blockNo = url.searchParams.get("block_no");

    let query = supabaseAdmin.from("granite_blocks").select("*");

    if (consignmentId) {
      query = query.eq("consignment_id", consignmentId);
    }
    
    if (blockNo) {
      query = query.eq("block_no", blockNo);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error('Database error fetching blocks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error fetching blocks:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Block creation request:', body);
    
    // Check if this is a bulk insert request
    if (body.blocks && Array.isArray(body.blocks)) {
      // Bulk insert
      const blocksToInsert = body.blocks.map((block: any) => {
        const insertData: any = {
          consignment_id: block.consignment_id,
          block_no: block.block_no.toUpperCase(),
          gross_measurement: parseFloat(block.gross_measurement) || 0,
          net_measurement: parseFloat(block.net_measurement) || 0,
          grade: block.grade || 'S/G',
          status: block.status || 'RAW' // Valid status: RAW, CUTTING, CUT, SOLD
        };
        
        // Only add marker_measurement if it exists and has a value
        if (block.marker_measurement !== undefined && block.marker_measurement !== null) {
          insertData.marker_measurement = parseFloat(block.marker_measurement);
        }
        
        return insertData;
      });

      console.log('Bulk inserting blocks:', blocksToInsert);

      const { data, error } = await supabaseAdmin
        .from("granite_blocks")
        .insert(blocksToInsert)
        .select('id, consignment_id, block_no, grade, gross_measurement, net_measurement, status, created_at');

      if (error) {
        console.error('Database error creating blocks:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      console.log('Blocks created successfully:', data);
      return NextResponse.json(data, { status: 201 });
    }

    // Single block insert
    const { consignment_id, block_no, gross_measurement, net_measurement, elavance, grade, marker_measurement, status } = body;

    if (!consignment_id || !block_no || gross_measurement === undefined || net_measurement === undefined) {
      console.log('Missing required fields:', { consignment_id, block_no, gross_measurement, net_measurement });
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    console.log('Preparing to insert block:', { consignment_id, block_no, gross_measurement, net_measurement, grade, status });

    // Use only the exact columns that can be inserted (not generated)
    const { data, error } = await supabaseAdmin
      .from("granite_blocks")
      .insert([{
        consignment_id: consignment_id,
        block_no: block_no.toUpperCase(),
        grade: grade || 'S/G',
        gross_measurement: parseFloat(gross_measurement),
        net_measurement: parseFloat(net_measurement),
        status: status || 'RAW',
        total_sqft: 0,
        total_slabs: 0,
        raw_material_rate_per_sqft: 0,
        production_cost_per_sqft: 40,
        total_cost_per_sqft: 0,
        total_sqft_produced: 0
      }])
      .select('id, consignment_id, block_no, grade, gross_measurement, net_measurement, status, created_at')
      .single();

    if (error) {
      console.error('Database error creating block:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    console.log('Block created successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Server error creating block:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const blockId = url.searchParams.get("id");

    if (!blockId) {
      return NextResponse.json({ error: "Block ID required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("granite_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, block_no, gross_measurement, net_measurement, elavance, grade } = body;

    if (!id) {
      return NextResponse.json({ error: "Block ID required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("granite_blocks")
      .update({
        block_no: block_no.toUpperCase(), // Always save block numbers in uppercase
        gross_measurement,
        net_measurement,
        elavance,
        grade
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
