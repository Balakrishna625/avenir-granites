import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("slab_grades")
    .select("name")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map((r: { name: string }) => r.name));
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Grade name is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("slab_grades")
    .insert({ name: name.trim() });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Grade already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
