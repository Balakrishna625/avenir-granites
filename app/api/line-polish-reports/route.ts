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
      activity, // Summary text like "S/G Polishing, B/P Grinding"
      activities, // JSONB array: [{ activity, slabs, sqft }]
      no_of_workers,
      total_slabs, // Aggregate across all activities
      total_sqft, // Aggregate across all activities
      no_of_hours, // Total hours for entire shift
      rate_per_hour,
      debit_amount, // Pre-calculated: no_of_hours * rate_per_hour
      remarks
    } = body;

    // Validate required fields
    if (!date || !shift || !activity) {
      return NextResponse.json(
        { error: "Date, shift, and activity are required" },
        { status: 400 }
      );
    }

    // Validate activities array
    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json(
        { error: "At least one activity is required in activities array" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("line_polish_reports")
      .insert({
        date,
        shift,
        activity, // Summary text for display
        activities, // JSONB array with detailed breakdown
        no_of_workers: no_of_workers || 3,
        total_slabs: total_slabs || 0, // Sum of all activities' slabs
        total_sqft: total_sqft || 0, // Sum of all activities' sqft
        no_of_hours: no_of_hours || 0, // Total hours for ENTIRE shift
        rate_per_hour: rate_per_hour || 250,
        debit_amount: debit_amount || 0, // Total amount for ENTIRE shift (not split per activity)
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
      activity, // Summary text
      activities, // JSONB array
      no_of_workers,
      total_slabs, // Aggregate
      total_sqft, // Aggregate
      no_of_hours,
      rate_per_hour,
      debit_amount, // Pre-calculated
      remarks
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updateData: any = {
      date,
      shift,
      no_of_workers: no_of_workers || 3,
      no_of_hours: no_of_hours || 0,
      rate_per_hour: rate_per_hour || 250,
      debit_amount: debit_amount || (no_of_hours || 0) * (rate_per_hour || 0),
      remarks
    };

    // If activities array is provided, use new JSONB format
    if (activities && Array.isArray(activities) && activities.length > 0) {
      updateData.activity = activity; // Summary text
      updateData.activities = activities; // JSONB array
      updateData.total_slabs = total_slabs || 0;
      updateData.total_sqft = total_sqft || 0;
    } else {
      // Fallback for old format (backward compatibility)
      updateData.activity = activity;
      updateData.number_of_slabs = body.number_of_slabs || 0;
      updateData.total_sqft = body.total_sqft || 0;
    }

    const { data, error } = await supabaseAdmin
      .from("line_polish_reports")
      .update(updateData)
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