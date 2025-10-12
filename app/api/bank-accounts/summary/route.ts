import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  try {
    // Get all bank accounts
    const { data: bankAccounts, error: accountsError } = await supabaseAdmin
      .from("bank_accounts")
      .select("id, name")
      .order("name");

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    // Get transactions data with date filtering
    let transactionsQuery = supabaseAdmin
      .from("transactions")
      .select("account_id, amount, mode");
    
    if (from) transactionsQuery = transactionsQuery.gte("date", from);
    if (to) transactionsQuery = transactionsQuery.lte("date", to);

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 500 });
    }

    // Calculate summaries for each bank account
    const accountSummaries = bankAccounts.map(account => {
      // Filter transactions for this account
      const accountTransactions = transactions.filter(t => t.account_id === account.id);

      // Calculate totals by mode
      const rtgsTotal = accountTransactions
        .filter(t => t.mode === "RTGS")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const cashTotal = accountTransactions
        .filter(t => t.mode === "CASH")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const total = rtgsTotal + cashTotal;

      return {
        id: account.id,
        name: account.name,
        total,
        rtgs: rtgsTotal,
        cash: cashTotal
      };
    });

    // Filter out accounts with zero transactions and sort by total (descending)
    const filteredSummaries = accountSummaries
      .filter(account => account.total > 0)
      .sort((a, b) => b.total - a.total);

    return NextResponse.json(filteredSummaries);
  } catch (error) {
    console.error("Error fetching bank accounts summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}