import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let q = supabaseAdmin.from("consignments").select("*");
  if (customerId && customerId !== "all") q = q.eq("customer_id", customerId);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  q = q.order("date", { ascending: true });

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { customer_id, date, total, rtgs_expected, cash_expected, remarks } = body || {};
  if (!customer_id || !date) return NextResponse.json({ error: "customer_id and date required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("consignments").insert({
    customer_id, date, total, rtgs_expected, cash_expected, remarks
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
