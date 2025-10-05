import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("granite_suppliers")
      .select("*")
      .order("name");

    if (error) {
      console.log('Database error loading suppliers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // If no suppliers exist, create fallback suppliers
    if (!data || data.length === 0) {
      console.log('No suppliers found, creating fallback suppliers');
      
      const fallbackSuppliers = [
        { id: 'supplier-1', name: 'Rising Sun Exports', contact_person: 'Manager', email: 'manager@risingsun.com', phone: '+91-9876543210' },
        { id: 'supplier-2', name: 'Bargandy Quarry', contact_person: 'Sales Head', email: 'sales@bargandy.com', phone: '+91-9876543211' },
        { id: 'supplier-3', name: 'Local Granite Quarry', contact_person: 'Owner', email: 'owner@localquarry.com', phone: '+91-9876543212' }
      ];
      
      const { data: createdSuppliers, error: createError } = await supabaseAdmin
        .from("granite_suppliers")
        .upsert(fallbackSuppliers)
        .select();
        
      if (createError) {
        console.error('Failed to create fallback suppliers:', createError);
        // Still return empty array rather than failing
        return NextResponse.json([]);
      }
      
      return NextResponse.json(createdSuppliers);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, contact_person, email, phone, address } = body;

    if (!name) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("granite_suppliers")
      .insert({
        name,
        contact_person,
        email,
        phone,
        address
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}