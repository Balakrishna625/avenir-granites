import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST - Set total payable amount for a contractor in a specific month
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractor_name, month, total_payable } = body;

    if (!contractor_name || !month || total_payable === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First, get or create the contractor payment record for this month
    let { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('contractor_payments')
      .select('*')
      .eq('contractor_name', contractor_name)
      .eq('month', month)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Record doesn't exist, calculate carry forward from previous month
      const [year, monthNum] = month.split('-').map(Number);
      const prevDate = new Date(year, monthNum - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const { data: prevData } = await supabaseAdmin
        .from('contractor_payments')
        .select('balance')
        .eq('contractor_name', contractor_name)
        .eq('month', prevMonth)
        .single();

      const carry_forward = prevData?.balance || 0;

      // Create new record with the payable amount
      const { data: newData, error: insertError } = await supabaseAdmin
        .from('contractor_payments')
        .insert({
          contractor_name: contractor_name,
          month: month,
          total_payable: parseFloat(total_payable),
          carry_forward: carry_forward,
          balance: carry_forward + parseFloat(total_payable) // Initial balance
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json(newData);
    } else if (fetchError) {
      throw fetchError;
    }

    // Record exists, update the total_payable and recalculate balance
    // Get all transactions to calculate total_paid
    const { data: transactions } = await supabaseAdmin
      .from('contractor_payment_transactions')
      .select('amount')
      .eq('contractor_payment_id', existingRecord.id);

    const total_paid = transactions?.reduce((sum, txn) => sum + parseFloat(txn.amount.toString()), 0) || 0;
    const new_balance = (existingRecord.carry_forward || 0) + parseFloat(total_payable) - total_paid;

    const { data, error } = await supabaseAdmin
      .from('contractor_payments')
      .update({ 
        total_payable: parseFloat(total_payable),
        balance: new_balance
      })
      .eq('contractor_name', contractor_name)
      .eq('month', month)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error setting payable amount:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
