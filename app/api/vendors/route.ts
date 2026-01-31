import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // Fetch all vendors
    const { data: vendors, error: vendorsError } = await supabaseAdmin
      .from("vendors")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (vendorsError) {
      return NextResponse.json({ error: vendorsError.message }, { status: 500 });
    }

    // Fetch all transactions to calculate balances
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from("vendor_transactions")
      .select("vendor_id, type, amount");

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 500 });
    }

    // Calculate balance for each vendor
    const vendorsWithBalances = vendors?.map(vendor => {
      const vendorTransactions = transactions?.filter(t => t.vendor_id === vendor.id) || [];
      
      const totalPurchases = vendorTransactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      const totalPayments = vendorTransactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      const balance = totalPurchases - totalPayments;

      return {
        ...vendor,
        total_purchases: totalPurchases,
        total_payments: totalPayments,
        balance: balance
      };
    }) || [];

    return NextResponse.json(vendorsWithBalances);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, contact_person, phone, email, address, gst_number, payment_terms } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });
    }
    
    if (!name) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
    }
    
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .update({ 
        name: name.trim(),
        contact_person: contact_person?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gst_number: gst_number?.trim() || null,
        payment_terms: payment_terms?.trim() || null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });
    }
    
    // Mark vendor as inactive instead of hard delete (soft delete)
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .update({ 
        is_active: false
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}