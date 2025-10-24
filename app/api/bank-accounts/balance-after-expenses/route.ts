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

    // Get OPENING BALANCE (all transactions BEFORE the selected period)
    let openingTransactionsQuery = supabaseAdmin
      .from("transactions")
      .select("account_id, amount, mode");
    
    if (from) openingTransactionsQuery = openingTransactionsQuery.lt("date", from);
    
    const { data: openingTransactions, error: openingTransactionsError } = await openingTransactionsQuery;

    if (openingTransactionsError) {
      return NextResponse.json({ error: openingTransactionsError.message }, { status: 500 });
    }

    // Get OPENING EXPENSES (all expenses BEFORE the selected period)
    let openingExpensesQuery = supabaseAdmin
      .from("expenses")
      .select("account_id, total_amount");
    
    if (from) openingExpensesQuery = openingExpensesQuery.lt("date", from);
    
    const { data: openingExpenses, error: openingExpensesError } = await openingExpensesQuery;

    if (openingExpensesError) {
      return NextResponse.json({ error: openingExpensesError.message }, { status: 500 });
    }

    // Get CURRENT PERIOD transactions (money received) with date filtering
    let transactionsQuery = supabaseAdmin
      .from("transactions")
      .select("account_id, amount, mode");
    
    if (from) transactionsQuery = transactionsQuery.gte("date", from);
    if (to) transactionsQuery = transactionsQuery.lte("date", to);

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 500 });
    }

    // Get CURRENT PERIOD expenses (money spent) with date filtering
    let expensesQuery = supabaseAdmin
      .from("expenses")
      .select("account_id, total_amount");
    
    if (from) expensesQuery = expensesQuery.gte("date", from);
    if (to) expensesQuery = expensesQuery.lte("date", to);

    const { data: expenses, error: expensesError } = await expensesQuery;

    if (expensesError) {
      return NextResponse.json({ error: expensesError.message }, { status: 500 });
    }

    // Calculate balance for each bank account
    const accountBalances = bankAccounts.map(account => {
      // Calculate OPENING BALANCE (carried forward from previous months)
      const openingReceived = openingTransactions
        .filter(t => t.account_id === account.id)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const openingSpent = openingExpenses
        .filter(e => e.account_id === account.id)
        .reduce((sum, e) => sum + (e.total_amount || 0), 0);
      
      const openingBalance = openingReceived - openingSpent;

      // Filter CURRENT PERIOD transactions for this account
      const accountTransactions = transactions.filter(t => t.account_id === account.id);

      // Calculate collections by mode for CURRENT PERIOD
      const rtgsReceived = accountTransactions
        .filter(t => t.mode === "RTGS")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const cashReceived = accountTransactions
        .filter(t => t.mode === "CASH")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const totalReceived = rtgsReceived + cashReceived;

      // Calculate total expenses for CURRENT PERIOD from this account
      const accountExpenses = expenses.filter(e => e.account_id === account.id);
      const totalExpenses = accountExpenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);

      // Calculate CLOSING BALANCE: Opening Balance + Received - Expenses
      const currentBalance = openingBalance + totalReceived - totalExpenses;

      return {
        id: account.id,
        name: account.name,
        openingBalance,     // Balance carried forward from previous months
        totalReceived,      // Total money collected in current period
        rtgs: rtgsReceived, // RTGS collections in current period
        cash: cashReceived, // Cash collections in current period
        totalExpenses,      // Total money spent in current period
        currentBalance      // Closing balance (opening + received - spent)
      };
    });

    // Filter out accounts with zero activity and sort by balance (descending)
    const filteredBalances = accountBalances
      .filter(account => account.totalReceived > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance);

    return NextResponse.json(filteredBalances);
  } catch (error) {
    console.error("Error fetching account balances after expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
