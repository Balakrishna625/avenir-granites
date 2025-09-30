import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { total, rtgs_expected, cash_expected, remarks } = body || {};
  
  const { data, error } = await supabaseAdmin
    .from("consignments")
    .update({ total, rtgs_expected, cash_expected, remarks })
    .eq("id", params.id)
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from("consignments")
    .delete()
    .eq("id", params.id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}