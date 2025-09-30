import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .order("name");
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, contact_person, phone, email, address, gst_number, payment_terms } = body;
  
  if (!name) return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
  
  // Generate vendor code
  const vendor_code = `VEN${Date.now().toString().slice(-6)}`;
  
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .insert({ 
      name: name.trim(),
      contact_person: contact_person?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      gst_number: gst_number?.trim() || null,
      vendor_code,
      payment_terms: payment_terms?.trim() || null
    })
    .select()
    .single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}