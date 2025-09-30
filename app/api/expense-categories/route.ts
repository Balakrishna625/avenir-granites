import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("expense_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, description, color } = body;
  
  if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  
  const { data, error } = await supabaseAdmin
    .from("expense_categories")
    .insert({ 
      name: name.trim(), 
      description: description?.trim() || null,
      color: color || '#6B7280'
    })
    .select()
    .single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}