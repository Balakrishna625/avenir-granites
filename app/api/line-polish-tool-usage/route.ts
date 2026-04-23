import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reportId = url.searchParams.get("report_id");
  const month = url.searchParams.get("month");   // YYYY-MM
  const toolType = url.searchParams.get("tool_type");

  try {
    let query = supabaseAdmin
      .from("line_polish_tool_usage")
      .select("*, line_polish_reports!inner(date, shift)")
      .order("created_at", { ascending: true });

    if (reportId) {
      query = query.eq("report_id", reportId);
    }

    if (month) {
      const [year, mon] = month.split("-");
      const startDate = `${year}-${mon.padStart(2, "0")}-01`;
      const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
      const endDate = `${year}-${mon.padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;
      query = query
        .gte("line_polish_reports.date", startDate)
        .lte("line_polish_reports.date", endDate);
    }

    if (toolType) {
      query = query.eq("tool_type", toolType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching tool usage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Accepts either a single object or { report_id, shift, usages: [...] }
    const { report_id, shift, usages } = body;

    if (!report_id || !shift || !Array.isArray(usages) || usages.length === 0) {
      return NextResponse.json(
        { error: "report_id, shift, and usages array are required" },
        { status: 400 }
      );
    }

    const rows = usages
      .filter((u: any) => u.tool_type && u.grade && parseFloat(u.sqft_produced) > 0)
      .map((u: any) => ({
        report_id,
        shift,
        tool_type: u.tool_type,
        grade: u.grade,
        brand: u.brand?.trim() || null,
        sqft_produced: parseFloat(u.sqft_produced) || 0,
        notes: u.notes?.trim() || null,
      }));

    if (rows.length === 0) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from("line_polish_tool_usage")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving tool usage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const reportId = url.searchParams.get("report_id");

  if (!reportId) {
    return NextResponse.json({ error: "report_id is required" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("line_polish_tool_usage")
      .delete()
      .eq("report_id", reportId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tool usage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
