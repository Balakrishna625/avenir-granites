import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET - Fetch vendor transactions by vendor ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendor_id');

    if (!vendorId) {
      return NextResponse.json(
        { error: "vendor_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("vendor_transactions")
      .select(`
        id,
        vendor_id,
        date,
        type,
        amount,
        notes,
        created_at,
        updated_at
      `)
      .eq("vendor_id", vendorId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new vendor transaction (purchase or payment)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendor_id, date, type, amount, notes } = body;

    // Validation
    if (!vendor_id) {
      return NextResponse.json(
        { error: "vendor_id is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    if (!type || !['purchase', 'payment'].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'purchase' or 'payment'" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Insert transaction
    const { data, error } = await supabaseAdmin
      .from("vendor_transactions")
      .insert({
        vendor_id,
        date,
        type,
        amount: parseFloat(amount),
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
