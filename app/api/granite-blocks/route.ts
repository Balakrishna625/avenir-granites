import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { consignment_id, block_no, gross_measurement, net_measurement, elavance, grade } = body;

    if (!consignment_id || !block_no || !gross_measurement || !net_measurement) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("granite_blocks")
      .insert({
        consignment_id,
        block_no,
        gross_measurement,
        net_measurement,
        elavance,
        grade,
        status: 'AVAILABLE'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
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
