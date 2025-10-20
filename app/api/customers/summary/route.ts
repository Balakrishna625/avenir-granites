import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const customerId = url.searchParams.get("customerId");

  try {
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