import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  try {
    // Get all customers with their old due amounts
    const { data: customers, error: customersError } = await supabaseAdmin
      .from("customers")
      .select("id, name, old_due_amount")
      .order("name");

    if (customersError) {
      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }

    // Get waived transactions (no date filtering - we want total waived amount across all time)
    const { data: waivedTransactions, error: waivedError } = await supabaseAdmin
      .from("waived_transactions")
      .select("customer_id, amount");

    if (waivedError) {
      return NextResponse.json({ error: waivedError.message }, { status: 500 });
    }

    // Get consignments data with date filtering
    let consignmentsQuery = supabaseAdmin
      .from("consignments")
      .select("customer_id, total, rtgs_expected, cash_expected, date");
    
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

    // Calculate summaries for each customer
    const customerSummaries = customers.map(customer => {
      // Filter consignments and transactions for this customer
      const customerConsignments = consignments.filter(c => c.customer_id === customer.id);
      const customerTransactions = transactions.filter(t => t.customer_id === customer.id);
      
      // Calculate total waived amount for this customer from waived_transactions
      const customerWaivedTransactions = waivedTransactions.filter(w => w.customer_id === customer.id);
      const waivedAmount = customerWaivedTransactions.reduce((sum, w) => sum + (w.amount || 0), 0);

      // Calculate totals
      const totalInvoiced = customerConsignments.reduce((sum, c) => sum + (c.total || 0), 0);
      const totalReceived = customerTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalPending = totalInvoiced - totalReceived;

      // Calculate collection efficiency
      const collectionEfficiency = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 0;

      // Find last payment date
      const lastPaymentDate = customerTransactions.length > 0 
        ? customerTransactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null;

      // Calculate average payment delay (simplified calculation)
      // This is a basic calculation - you could make it more sophisticated
      let avgPaymentDelay = 0;
      if (customerConsignments.length > 0 && customerTransactions.length > 0) {
        const consignmentDates = customerConsignments.map(c => new Date(c.date));
        const transactionDates = customerTransactions.map(t => new Date(t.date));
        
        if (consignmentDates.length > 0 && transactionDates.length > 0) {
          const avgConsignmentDate = new Date(
            consignmentDates.reduce((sum, date) => sum + date.getTime(), 0) / consignmentDates.length
          );
          const avgTransactionDate = new Date(
            transactionDates.reduce((sum, date) => sum + date.getTime(), 0) / transactionDates.length
          );
          
          avgPaymentDelay = Math.max(0, 
            (avgTransactionDate.getTime() - avgConsignmentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }

      // Calculate total receivables (total invoiced + old due - total received - waived amount)
      // Waived amount is subtracted because customer won't pay it
      const totalReceivables = totalInvoiced + (customer.old_due_amount || 0) - totalReceived - waivedAmount;

      return {
        id: customer.id,
        name: customer.name,
        totalInvoiced,
        totalReceived,
        totalPending: Math.max(0, totalPending - waivedAmount), // Subtract waived amount from pending
        oldDueAmount: customer.old_due_amount || 0,
        waivedAmount: waivedAmount,
        totalReceivables: Math.max(0, totalReceivables), // Ensure non-negative
        consignmentCount: customerConsignments.length,
        lastPaymentDate,
        collectionEfficiency: Math.round(collectionEfficiency * 10) / 10, // Round to 1 decimal
        avgPaymentDelay: Math.round(avgPaymentDelay * 10) / 10 // Round to 1 decimal
      };
    });

    // Sort by total invoiced (descending) to show most active customers first
    customerSummaries.sort((a, b) => b.totalInvoiced - a.totalInvoiced);

    return NextResponse.json(customerSummaries);
  } catch (error) {
    console.error("Error fetching customer summaries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}