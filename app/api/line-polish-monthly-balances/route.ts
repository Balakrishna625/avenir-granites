import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// GET: Fetch monthly balance for a specific month or all balances
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    let query = supabase
      .from('line_polish_monthly_balances')
      .select('*')
      .order('month', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching monthly balances:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create or update monthly balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, opening_balance, total_work_amount, total_payments, closing_balance, notes } = body;

    if (!month) {
      return NextResponse.json({ error: 'Month is required (format: YYYY-MM)' }, { status: 400 });
    }

    // Check if balance already exists for this month
    const { data: existing } = await supabase
      .from('line_polish_monthly_balances')
      .select('*')
      .eq('month', month)
      .single();

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('line_polish_monthly_balances')
        .update({
          opening_balance: opening_balance ?? existing.opening_balance,
          total_work_amount: total_work_amount ?? existing.total_work_amount,
          total_payments: total_payments ?? existing.total_payments,
          closing_balance: closing_balance ?? existing.closing_balance,
          notes: notes ?? existing.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('month', month)
        .select()
        .single();

      if (error) {
        console.error('Error updating monthly balance:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('line_polish_monthly_balances')
        .insert({
          month,
          opening_balance: opening_balance || 0,
          total_work_amount: total_work_amount || 0,
          total_payments: total_payments || 0,
          closing_balance: closing_balance || 0,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating monthly balance:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update monthly balance calculations (called when reports/payments change)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { month } = body;

    if (!month) {
      return NextResponse.json({ error: 'Month is required (format: YYYY-MM)' }, { status: 400 });
    }

    // Get the previous month's closing balance
    const previousMonth = getPreviousMonth(month);
    const { data: previousBalance } = await supabase
      .from('line_polish_monthly_balances')
      .select('closing_balance')
      .eq('month', previousMonth)
      .single();

    const openingBalance = previousBalance?.closing_balance || 0;

    // Calculate total work amount from reports for this month
    const { data: reports } = await supabase
      .from('line_polish_reports')
      .select('polishing_total_amount, grinding_total_amount')
      .gte('date', `${month}-01`)
      .lt('date', `${getNextMonth(month)}-01`);

    const totalWorkAmount = reports?.reduce((sum, report) => {
      return sum + (report.polishing_total_amount || 0) + (report.grinding_total_amount || 0);
    }, 0) || 0;

    // Calculate total payments for this month
    const { data: payments } = await supabase
      .from('line_polish_payments')
      .select('amount')
      .gte('payment_date', `${month}-01`)
      .lt('payment_date', `${getNextMonth(month)}-01`);

    const totalPayments = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Calculate closing balance: opening + work - payments
    const closingBalance = openingBalance + totalWorkAmount - totalPayments;

    // Upsert the monthly balance
    const { data: balance, error } = await supabase
      .from('line_polish_monthly_balances')
      .upsert({
        month,
        opening_balance: openingBalance,
        total_work_amount: totalWorkAmount,
        total_payments: totalPayments,
        closing_balance: closingBalance,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'month',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating monthly balance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If there's a next month balance, update its opening balance
    const nextMonth = getNextMonth(month);
    const { data: nextMonthBalance } = await supabase
      .from('line_polish_monthly_balances')
      .select('*')
      .eq('month', nextMonth)
      .single();

    if (nextMonthBalance) {
      // Recalculate next month with new opening balance
      await supabase
        .from('line_polish_monthly_balances')
        .update({
          opening_balance: closingBalance,
          closing_balance: closingBalance + nextMonthBalance.total_work_amount - nextMonthBalance.total_payments,
          updated_at: new Date().toISOString(),
        })
        .eq('month', nextMonth);
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  if (monthNum === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(monthNum - 1).padStart(2, '0')}`;
}

function getNextMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  if (monthNum === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(monthNum + 1).padStart(2, '0')}`;
}
