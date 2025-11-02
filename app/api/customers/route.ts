import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filterType = url.searchParams.get("type"); // 'regular' | 'one-time' | 'all' | 'for-payments'
  
  // Special filter for Customer Payments dropdown
  // Shows: Regular customers (always) + One-time customers (only if outstanding amount > 0)
  if (filterType === "for-payments") {
    // Get all customers with their transactions, consignments, and waived transactions
    const { data: customers, error } = await supabaseAdmin
      .from("customers")
      .select(`
        *,
        transactions(amount),
        consignments(total),
        waived_transactions(amount)
      `)
      .order("created_at", { ascending: false });
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Calculate total receivables for each customer and filter
    const filteredCustomers = customers?.filter((customer: any) => {
      // ALWAYS show regular customers (regardless of balance)
      if (customer.customer_type === 'regular' || !customer.customer_type) {
        return true;
      }
      
      // For one-time customers: only show if they have outstanding amount
      if (customer.customer_type === 'one-time') {
        // Calculate consignments total (sales/invoices)
        const consignmentsTotal = customer.consignments?.reduce(
          (sum: number, c: any) => sum + (Number(c.total) || 0),
          0
        ) || 0;
        
        // Calculate total transactions (payments received)
        const totalTransactions = customer.transactions?.reduce(
          (sum: number, t: any) => sum + (Number(t.amount) || 0),
          0
        ) || 0;
        
        // Calculate waived amount
        const waivedAmount = customer.waived_transactions?.reduce(
          (sum: number, wt: any) => sum + (Number(wt.amount) || 0),
          0
        ) || 0;
        
        // Total Receivables = Consignments + Old Due - Payments - Waived
        const totalReceivables = consignmentsTotal + (Number(customer.old_due_amount) || 0) - totalTransactions - waivedAmount;
        
        // Only show one-time customer if outstanding amount > ₹1
        return totalReceivables > 1;
      }
      
      return false;
    }) || [];
    
    return NextResponse.json(filteredCustomers);
  }
  
  // Standard filtering (for admin pages)
  let query = supabaseAdmin.from("customers").select("*").order("created_at", { ascending: false });
  
  if (filterType === "regular") {
    query = query.eq("customer_type", "regular");
  } else if (filterType === "one-time") {
    query = query.eq("customer_type", "one-time");
  }
  // filterType === 'all' or null = no filter
  
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body?.name || "").trim();
  const customerType = body?.customer_type || "regular"; // Default to regular
  
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  
  // Validate customer_type
  if (!["regular", "one-time"].includes(customerType)) {
    return NextResponse.json({ error: "customer_type must be 'regular' or 'one-time'" }, { status: 400 });
  }
  
  // Initialize old_due_amount to 0 for new customers
  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({ name, old_due_amount: 0, customer_type: customerType })
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, old_due_amount, waived_amount, customer_type } = body;
  
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }
  
  // Build update object dynamically
  const updateData: any = {};
  
  if (old_due_amount !== undefined) {
    if (old_due_amount < 0) {
      return NextResponse.json({ error: "Old due amount must be 0 or greater" }, { status: 400 });
    }
    updateData.old_due_amount = old_due_amount;
  }
  
  if (waived_amount !== undefined) {
    if (waived_amount < 0) {
      return NextResponse.json({ error: "Waived amount must be 0 or greater" }, { status: 400 });
    }
    updateData.waived_amount = waived_amount;
  }
  
  if (customer_type !== undefined) {
    if (!["regular", "one-time"].includes(customer_type)) {
      return NextResponse.json({ error: "customer_type must be 'regular' or 'one-time'" }, { status: 400 });
    }
    updateData.customer_type = customer_type;
  }
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from("customers")
      .update(updateData)
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
