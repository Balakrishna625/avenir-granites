import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const customerId = url.searchParams.get("customerId");

  try {
    // Check if optimization functions exist
    const { data: functionExists } = await supabaseAdmin
      .rpc('get_all_customer_summaries', {
        p_from_date: from || null,
        p_to_date: to || null
      })
      .then(
        (result) => ({ data: true, error: null }),
        (error) => ({ data: false, error })
      );

    // If optimization not applied, fall back to old method
    if (!functionExists) {
      console.warn('Performance optimization not applied. Run migrations/optimize_customer_queries.sql');
      return fallbackGetCustomerSummaries(from, to, customerId);
    }

    // If requesting single customer summary (for detail page)
    if (customerId) {
      const { data, error } = await supabaseAdmin
        .rpc('get_customer_summary_optimized', {
          p_customer_id: customerId,
          p_from_date: from || null,
          p_to_date: to || null
        });

      if (error) {
        console.error("Error fetching customer summary:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Return as array for compatibility
      return NextResponse.json([data]);
    }

    // Otherwise, get all customer summaries using optimized function
    const { data: customerSummaries, error } = await supabaseAdmin
      .rpc('get_all_customer_summaries', {
        p_from_date: from || null,
        p_to_date: to || null
      });

    if (error) {
      console.error("Error fetching customer summaries:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ensure we always return an array
    if (!Array.isArray(customerSummaries)) {
      console.error("Expected array from get_all_customer_summaries, got:", typeof customerSummaries);
      return NextResponse.json([]);
    }

    // Transform snake_case to camelCase for frontend compatibility
    const formattedSummaries = customerSummaries.map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      totalInvoiced: customer.total_invoiced,
      totalReceived: customer.total_received,
      totalPending: Math.max(0, customer.total_pending - (customer.waived_amount || 0)),
      oldDueAmount: customer.old_due_amount || 0,
      waivedAmount: customer.waived_amount || 0,
      totalReceivables: Math.max(0, customer.total_receivables),
      consignmentCount: customer.consignment_count,
      transactionCount: customer.transaction_count,
      lastPaymentDate: customer.last_payment_date,
      lastInvoiceDate: customer.last_invoice_date,
      collectionEfficiency: customer.collection_efficiency,
      avgPaymentDelay: customer.avg_payment_delay
    }));

    return NextResponse.json(formattedSummaries);
  } catch (error) {
    console.error("Error fetching customer summaries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Fallback method when optimization migration hasn't been run
async function fallbackGetCustomerSummaries(from: string | null, to: string | null, customerId: string | null) {
  try {
    // Get all customers with their old due amounts
    let customersQuery = supabaseAdmin
      .from("customers")
      .select("id, name, old_due_amount")
      .order("name");

    if (customerId) {
      customersQuery = customersQuery.eq('id', customerId);
    }

    const { data: customers, error: customersError } = await customersQuery;

    if (customersError) {
      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }

    // Get waived transactions
    const { data: waivedTransactions, error: waivedError } = await supabaseAdmin
      .from("waived_transactions")
      .select("customer_id, amount");

    if (waivedError) {
      return NextResponse.json({ error: waivedError.message }, { status: 500 });
    }

    // Get consignments data with date filtering
    let consignmentsQuery = supabaseAdmin
      .from("consignments")
      .select("customer_id, total, date");
    
    if (from) consignmentsQuery = consignmentsQuery.gte("date", from);
    if (to) consignmentsQuery = consignmentsQuery.lte("date", to);

    const { data: consignments, error: consignmentsError } = await consignmentsQuery;

    if (consignmentsError) {
      return NextResponse.json({ error: consignmentsError.message }, { status: 500 });
    }

    // Get transactions data with date filtering
    let transactionsQuery = supabaseAdmin
      .from("transactions")
      .select("customer_id, amount, date");
    
    if (from) transactionsQuery = transactionsQuery.gte("date", from);
    if (to) transactionsQuery = transactionsQuery.lte("date", to);

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 500 });
    }

    // Calculate summaries
    const customerSummaries = customers.map(customer => {
      const customerConsignments = consignments.filter(c => c.customer_id === customer.id);
      const customerTransactions = transactions.filter(t => t.customer_id === customer.id);
      const customerWaivedTransactions = waivedTransactions.filter(w => w.customer_id === customer.id);
      const waivedAmount = customerWaivedTransactions.reduce((sum, w) => sum + (w.amount || 0), 0);

      const totalInvoiced = customerConsignments.reduce((sum, c) => sum + (c.total || 0), 0);
      const totalReceived = customerTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalPending = totalInvoiced - totalReceived;
      const collectionEfficiency = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 0;
      
      const lastPaymentDate = customerTransactions.length > 0 
        ? customerTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null;

      const totalReceivables = totalInvoiced + (customer.old_due_amount || 0) - totalReceived - waivedAmount;

      return {
        id: customer.id,
        name: customer.name,
        totalInvoiced,
        totalReceived,
        totalPending: Math.max(0, totalPending - waivedAmount),
        oldDueAmount: customer.old_due_amount || 0,
        waivedAmount: waivedAmount,
        totalReceivables: Math.max(0, totalReceivables),
        consignmentCount: customerConsignments.length,
        lastPaymentDate,
        collectionEfficiency: Math.round(collectionEfficiency * 10) / 10,
        avgPaymentDelay: 0
      };
    });

    customerSummaries.sort((a, b) => b.totalInvoiced - a.totalInvoiced);

    return NextResponse.json(customerSummaries);
  } catch (error) {
    console.error("Fallback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}