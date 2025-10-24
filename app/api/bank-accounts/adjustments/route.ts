import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET - Fetch all adjustments
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("bank_account_adjustments")
      .select(`
        id,
        bank_account_id,
        adjustment_amount,
        notes,
        effective_date,
        bank_accounts (
          id,
          name
        )
      `)
      .order("effective_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or update adjustment for an account
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bank_account_id, adjustment_amount, notes, effective_date } = body;

    if (!bank_account_id) {
      return NextResponse.json(
        { error: "bank_account_id is required" },
        { status: 400 }
      );
    }

    // Upsert: Insert or update if exists
    const { data, error } = await supabaseAdmin
      .from("bank_account_adjustments")
      .upsert(
        {
          bank_account_id,
          adjustment_amount: adjustment_amount || 0,
          notes: notes || null,
          effective_date: effective_date || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'bank_account_id',
          ignoreDuplicates: false
        }
      )
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
