import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("customers").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  
  // Initialize old_due_amount to 0 for new customers
  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({ name, old_due_amount: 0 })
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, old_due_amount } = body;
  
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }
  
  if (old_due_amount === undefined || old_due_amount < 0) {
    return NextResponse.json({ error: "Old due amount must be 0 or greater" }, { status: 400 });
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from("customers")
      .update({ old_due_amount })
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating customer old due amount:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  try {
    // Check if customer has any consignments
    const { data: consignments, error: consignmentError } = await supabaseAdmin
      .from("consignments")
      .select("id")
      .eq("customer_id", id);
    
    if (consignmentError) {
      return NextResponse.json({ error: consignmentError.message }, { status: 500 });
    }

    // Check if customer has any transactions
    const { data: transactions, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("customer_id", id);
    
    if (transactionError) {
      return NextResponse.json({ error: transactionError.message }, { status: 500 });
    }

    const totalUsage = (consignments?.length || 0) + (transactions?.length || 0);
    
    if (totalUsage > 0) {
      return NextResponse.json({
        error: "Cannot delete customer",
        inUse: true,
        usageCount: totalUsage,
        consignmentCount: consignments?.length || 0,
        transactionCount: transactions?.length || 0
      }, { status: 400 });
    }

    // If no related data, proceed with deletion
    const { error: deleteError } = await supabaseAdmin
      .from("customers")
      .delete()
      .eq("id", id);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
