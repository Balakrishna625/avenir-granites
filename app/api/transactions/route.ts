import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  const periodId = url.searchParams.get("periodId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const mode = url.searchParams.get("mode");
  const activeOnly = url.searchParams.get("activeOnly") === "true";

  let q = supabaseAdmin.from("transactions").select("*");
  if (customerId && customerId !== "all") q = q.eq("customer_id", customerId);
  if (periodId) q = q.eq("period_id", periodId);
  
  // If activeOnly is true, only get transactions from the active period
  if (activeOnly && customerId && customerId !== "all") {
    // First, get the active period ID for this customer
    const { data: activePeriod } = await supabaseAdmin
      .from("customer_account_periods")
      .select("id")
      .eq("customer_id", customerId)
      .eq("is_active", true)
      .single();
    
    if (activePeriod) {
      q = q.eq("period_id", activePeriod.id);
    } else {
      // No active period means no transactions should be shown
      return NextResponse.json([]);
    }
  }
  
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  if (mode) q = q.eq("mode", mode);
  q = q.order("date", { ascending: true });

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { customer_id, date, mode, account_id, amount, note } = body || {};
  if (!customer_id || !date || !mode || !account_id || !amount)
    return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("transactions").insert({
    customer_id, date, mode, account_id, amount, note
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
