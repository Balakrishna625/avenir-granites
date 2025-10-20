import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET: Get detailed data for a specific customer period
export async function GET(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const periodId = params.periodId;

    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    // Get period details
    const { data: period, error: periodError } = await supabaseAdmin
      .from('customer_account_periods')
      .select('*, customers(name)')
      .eq('id', periodId)
      .single();

    if (periodError) {
      console.error('Error fetching period:', periodError);
      return NextResponse.json({ error: periodError.message }, { status: 500 });
    }

    // Get all consignments for this period
    const { data: consignments, error: consignmentsError } = await supabaseAdmin
      .from('consignments')
      .select('*')
      .eq('period_id', periodId)
      .order('date', { ascending: false });

    if (consignmentsError) {
      console.error('Error fetching consignments:', consignmentsError);
    }

    // Get all transactions for this period
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('*, bank_accounts(name)')
      .eq('period_id', periodId)
      .order('date', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
    }

    return NextResponse.json({
      period,
      consignments: consignments || [],
      transactions: transactions || [],
      summary: {
        totalInvoiced: period.total_invoiced || 0,
        totalReceived: period.total_received || 0,
        totalPending: period.total_pending || 0,
        oldDueAmount: period.old_due_amount || 0,
        waivedAmount: period.waived_amount || 0,
        settlementAmount: period.settlement_amount || 0,
        consignmentCount: consignments?.length || 0,
        transactionCount: transactions?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in period details API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
