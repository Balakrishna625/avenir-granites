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
          block_no: block.block_no ? block.block_no.toUpperCase() : null, // Allow null for placeholders
          gross_measurement: block.gross_measurement ? parseFloat(block.gross_measurement) : null, // Allow null for placeholders
          net_measurement: parseFloat(block.net_measurement) || 0,
          grade: block.grade || 'S/G',
          status: block.status || 'RAW', // Processing status (RAW/CUTTING/CUT/SOLD)
          arrival_status: block.arrival_status || 'pending' // Arrival status: 'pending' or 'received'
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
        .select('id, consignment_id, block_no, grade, gross_measurement, net_measurement, status, arrival_status, created_at');

      if (error) {
        console.error('Database error creating blocks:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      console.log('Blocks created successfully:', data);
      return NextResponse.json(data, { status: 201 });
    }

    // Single block insert
    const { consignment_id, block_no, gross_measurement, net_measurement, elavance, grade, marker_measurement, status } = body;

    // Only consignment_id is required for placeholder blocks
    if (!consignment_id) {
      console.log('Missing required field: consignment_id');
      return NextResponse.json({ error: "Consignment ID is required" }, { status: 400 });
    }

    console.log('Preparing to insert block:', { consignment_id, block_no, gross_measurement, net_measurement, grade, status });

    // Use only the exact columns that can be inserted (not generated)
    const { data, error } = await supabaseAdmin
      .from("granite_blocks")
      .insert([{
        consignment_id: consignment_id,
        block_no: block_no ? block_no.toUpperCase() : null, // Allow null for placeholders
        grade: grade || 'S/G',
        gross_measurement: gross_measurement ? parseFloat(gross_measurement) : null, // Allow null for placeholders
        net_measurement: parseFloat(net_measurement) || 0,
        status: status || 'RAW', // Processing status (RAW/CUTTING/CUT/SOLD)
        arrival_status: 'pending', // Default to 'pending' for placeholder blocks
        total_sqft: 0,
        total_slabs: 0,
        raw_material_rate_per_sqft: 0,
        production_cost_per_sqft: 40,
        total_cost_per_sqft: 0,
        total_sqft_produced: 0
      }])
      .select('id, consignment_id, block_no, grade, gross_measurement, net_measurement, status, arrival_status, created_at')
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
    const { id, block_no, gross_measurement, net_measurement, elavance, grade, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Block ID required" }, { status: 400 });
    }

    // Build update object
    const updateData: any = {};
    
    if (block_no !== undefined) updateData.block_no = block_no ? block_no.toUpperCase() : null;
    if (gross_measurement !== undefined) updateData.gross_measurement = gross_measurement ? parseFloat(gross_measurement) : null;
    if (net_measurement !== undefined) updateData.net_measurement = parseFloat(net_measurement) || 0;
    if (elavance !== undefined) updateData.elavance = elavance;
    if (grade !== undefined) updateData.grade = grade;
    if (status !== undefined) updateData.status = status;
    
    // Auto-update arrival_status to 'received' if both block_no and gross_measurement are provided
    if (block_no && gross_measurement) {
      updateData.arrival_status = 'received';
    }

    const { data, error } = await supabaseAdmin
      .from("granite_blocks")
      .update(updateData)
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
