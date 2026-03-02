import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * GET /api/expenses/monthly-summary
 * Returns month-wise summary of:
 * - Total amounts received (from all transactions, all customers, all accounts)
 * - Total expenses
 * - Outstanding balance (received - expenses)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const months = parseInt(url.searchParams.get("months") || "12");

    // Calculate date range
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get all transactions (amounts received) - consolidated from ALL customers and ALL accounts
    const { data: transactions, error: transError } = await supabaseAdmin
      .from("transactions")
      .select("date, amount")
      .gte("date", startDateStr)
      .order("date", { ascending: true });

    if (transError) {
      console.error("Error fetching transactions:", transError);
      return NextResponse.json({ error: transError.message }, { status: 500 });
    }

    // Get all expenses
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from("expenses")
      .select("date, total_amount")
      .gte("date", startDateStr)
      .order("date", { ascending: true });

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError);
      return NextResponse.json({ error: expensesError.message }, { status: 500 });
    }

    // Group by month
    interface MonthData {
      month: string; // "OCT-2025" format
      monthDate: string; // First day of month for sorting
      totalReceived: number;
      totalExpenses: number;
      outstandingBalance: number;
      transactionCount: number;
      expenseCount: number;
    }

    const monthlyMap = new Map<string, MonthData>();

    // Helper to get month key
    const getMonthKey = (dateStr: string): string => {
      const date = new Date(dateStr);
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
    };

    const getMonthDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    };

    // Process transactions (amounts received)
    transactions?.forEach((transaction) => {
      const monthKey = getMonthKey(transaction.date);
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          monthDate: getMonthDate(transaction.date),
          totalReceived: 0,
          totalExpenses: 0,
          outstandingBalance: 0,
          transactionCount: 0,
          expenseCount: 0,
        });
      }
      const monthData = monthlyMap.get(monthKey)!;
      monthData.totalReceived += transaction.amount;
      monthData.transactionCount += 1;
    });

    // Process expenses
    expenses?.forEach((expense) => {
      const monthKey = getMonthKey(expense.date);
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          monthDate: getMonthDate(expense.date),
          totalReceived: 0,
          totalExpenses: 0,
          outstandingBalance: 0,
          transactionCount: 0,
          expenseCount: 0,
        });
      }
      const monthData = monthlyMap.get(monthKey)!;
      monthData.totalExpenses += expense.total_amount;
      monthData.expenseCount += 1;
    });

    // Calculate outstanding balance for each month
    monthlyMap.forEach((data) => {
      data.outstandingBalance = data.totalReceived - data.totalExpenses;
    });

    // Convert to array and sort by date descending
    const monthlySummary = Array.from(monthlyMap.values()).sort((a, b) => {
      return new Date(b.monthDate).getTime() - new Date(a.monthDate).getTime();
    });

    // Calculate totals
    const totals = {
      totalReceived: monthlySummary.reduce((sum, m) => sum + m.totalReceived, 0),
      totalExpenses: monthlySummary.reduce((sum, m) => sum + m.totalExpenses, 0),
      totalOutstanding: monthlySummary.reduce((sum, m) => sum + m.outstandingBalance, 0),
      totalMonths: monthlySummary.length,
    };

    return NextResponse.json({
      monthlySummary,
      totals,
    });
  } catch (error: any) {
    console.error("Error in monthly summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
