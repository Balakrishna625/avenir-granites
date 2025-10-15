import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const shift = url.searchParams.get("shift");
  const activity = url.searchParams.get("activity");

  try {
    let query = supabaseAdmin
      .from("line_polish_reports")
      .select("*")
      .order("date", { ascending: false })
      .order("shift", { ascending: true });

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    if (shift) query = query.eq("shift", shift);
    if (activity) query = query.eq("activity", activity);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching line polish reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      date,
      shift,
      activity,
      no_of_workers,
      number_of_slabs,
      total_sqft,
      no_of_hours,
      rate_per_hour,
      remarks
    } = body;

    // Validate required fields
    if (!date || !shift || !activity) {
      return NextResponse.json(
        { error: "Date, shift, and activity are required" },
        { status: 400 }
      );
    }

    // Calculate debit amount
    const debit_amount = (no_of_hours || 0) * (rate_per_hour || 0);

    const { data, error } = await supabaseAdmin
      .from("line_polish_reports")
      .insert({
        date,
        shift,
        activity,
        no_of_workers: no_of_workers || 3, // Default to 3
        number_of_slabs: number_of_slabs || 0,
        total_sqft: total_sqft || 0,
        no_of_hours: no_of_hours || 0,
        rate_per_hour: rate_per_hour || 250, // Default to 250
        debit_amount,
        remarks
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating line polish report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      date,
      shift,
      activity,
      no_of_workers,
      number_of_slabs,
      total_sqft,
      no_of_hours,
      rate_per_hour,
      remarks
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Calculate debit amount
    const debit_amount = (no_of_hours || 0) * (rate_per_hour || 0);

    const { data, error } = await supabaseAdmin
      .from("line_polish_reports")
      .update({
        date,
        shift,
        activity,
        no_of_workers: no_of_workers || 3,
        number_of_slabs: number_of_slabs || 0,
        total_sqft: total_sqft || 0,
        no_of_hours: no_of_hours || 0,
        rate_per_hour: rate_per_hour || 250,
        debit_amount,
        remarks
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating line polish report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("line_polish_reports")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting line polish report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}