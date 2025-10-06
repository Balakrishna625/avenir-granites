import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const consignmentId = url.searchParams.get("consignment_id");
    const blockId = url.searchParams.get("block_id");

    let query = supabaseAdmin
      .from("granite_block_parts")
      .select(`
        *,
        granite_blocks!inner (
          id,
          block_no,
          consignment_id,
          granite_consignments!inner (
            id,
            consignment_number,
            supplier_id,
            granite_suppliers (
              id,
              name
            )
          )
        )
      `);

    if (consignmentId) {
      query = query.eq("granite_blocks.consignment_id", consignmentId);
    }

    if (blockId) {
      query = query.eq("block_id", blockId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error('Database error fetching slab processing:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error fetching slab processing:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Slab processing creation request:', body);
    
    const { block_id, part_name, slabs_count, sqft, thickness } = body;

    if (!block_id || !part_name || !slabs_count || !sqft) {
      console.log('Missing required fields:', { block_id, part_name, slabs_count, sqft });
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const insertData = {
      block_id,
      part_name: part_name.toUpperCase(), // Ensure part names are uppercase
      slabs_count: parseInt(slabs_count),
      sqft: parseFloat(sqft),
      thickness: parseFloat(thickness) || 20, // Default thickness
      status: 'PRODUCED'
    };

    console.log('Inserting slab processing data:', insertData);

    const { data, error } = await supabaseAdmin
      .from("granite_block_parts")
      .insert(insertData)
      .select(`
        *,
        granite_blocks (
          id,
          block_no,
          consignment_id
        )
      `)
      .single();

    if (error) {
      console.error('Database error creating slab processing:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    console.log('Slab processing created successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Server error creating slab processing:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, part_name, slabs_count, sqft, thickness } = body;

    if (!id) {
      return NextResponse.json({ error: "Slab processing ID required" }, { status: 400 });
    }

    const updateData: any = {
      part_name: part_name?.toUpperCase(),
      slabs_count: parseInt(slabs_count),
      sqft: parseFloat(sqft),
      thickness: parseFloat(thickness)
    };

    const { data, error } = await supabaseAdmin
      .from("granite_block_parts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating slab processing:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error updating slab processing:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Slab processing ID required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("granite_block_parts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error('Database error deleting slab processing:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error deleting slab processing:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}