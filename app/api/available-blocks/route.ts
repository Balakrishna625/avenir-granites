import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const consignmentId = url.searchParams.get("consignment_id");

    let query = supabaseAdmin
      .from("granite_blocks")
      .select(`
        id,
        block_no,
        consignment_id,
        gross_measurement,
        net_measurement,
        status,
        granite_consignments!inner (
          id,
          consignment_number,
          supplier_id,
          granite_suppliers (
            id,
            name
          )
        )
      `);
      // Removed status filter - show ALL blocks regardless of status

    if (consignmentId) {
      query = query.eq("consignment_id", consignmentId);
    }

    const { data, error } = await query.order("block_no", { ascending: true });

    if (error) {
      console.error('Database error fetching available blocks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error fetching available blocks:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}