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
    
    const { consignment_id, block_no, gross_measurement, net_measurement, elavance, grade, marker_measurement } = body;

    if (!consignment_id || !block_no || !gross_measurement || !net_measurement) {
      console.log('Missing required fields:', { consignment_id, block_no, gross_measurement, net_measurement });
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Prepare insert data - include marker_measurement if provided, otherwise use net_measurement as default
    const insertData: any = {
      consignment_id,
      block_no,
      gross_measurement: parseFloat(gross_measurement),
      net_measurement: parseFloat(net_measurement),
      // Don't include elavance - it's a computed column that calculates automatically
      grade,
      status: 'RAW'  // Changed from 'AVAILABLE' to 'RAW' to match schema
    };

    // Add marker_measurement if the field exists (for new schema)
    if (marker_measurement !== undefined) {
      insertData.marker_measurement = parseFloat(marker_measurement);
    }

    console.log('Inserting block data:', insertData);

    const { data, error } = await supabaseAdmin
      .from("granite_blocks")
      .insert(insertData)
      .select()
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
        block_no,
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
