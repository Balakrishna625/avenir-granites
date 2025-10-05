import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const consignmentId = url.searchParams.get("id");

    if (consignmentId) {
      const { data, error } = await supabaseAdmin
        .from("granite_consignments")
        .select(`
          *,
          supplier:granite_suppliers(id, name, contact_person),
          blocks:granite_blocks(id, block_no, gross_measurement, net_measurement, elavance, grade, status)
        `)
        .eq("id", consignmentId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabaseAdmin
        .from("granite_consignments")
        .select(`*, supplier:granite_suppliers(id, name, contact_person)`)
        .order("arrival_date", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { consignment_number, supplier_id, arrival_date, payment_cash = 0, payment_upi = 0, transport_cost = 0, notes } = body;

    if (!consignment_number || !supplier_id || !arrival_date) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const total_expenditure = parseFloat(payment_cash || 0) + parseFloat(payment_upi || 0) + parseFloat(transport_cost || 0);

    const { data, error } = await supabaseAdmin
      .from("granite_consignments")
      .insert({
        consignment_number,
        supplier_id,
        arrival_date,
        payment_cash: parseFloat(payment_cash || 0),
        payment_upi: parseFloat(payment_upi || 0),
        transport_cost: parseFloat(transport_cost || 0),
        total_expenditure,
        notes,
        status: 'ACTIVE'
      })
      .select(`*, supplier:granite_suppliers(id, name, contact_person)`)
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
    const consignmentId = url.searchParams.get("id");

    if (!consignmentId) {
      return NextResponse.json({ error: "Consignment ID required" }, { status: 400 });
    }

    // First delete all blocks associated with this consignment
    await supabaseAdmin
      .from("granite_blocks")
      .delete()
      .eq("consignment_id", consignmentId);

    // Then delete the consignment
    const { error } = await supabaseAdmin
      .from("granite_consignments")
      .delete()
      .eq("id", consignmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
