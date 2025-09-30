import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const mode = url.searchParams.get("mode");

  let q = supabaseAdmin.from("transactions").select("*");
  if (customerId && customerId !== "all") q = q.eq("customer_id", customerId);
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
