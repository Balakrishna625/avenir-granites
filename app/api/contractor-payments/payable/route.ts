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

      console.log(`Setting payable for ${contractor_name} in ${month}, checking carry forward from: ${prevMonth}`);

      const { data: prevData, error: prevError } = await supabaseAdmin
        .from('contractor_payments')
        .select('*')
        .eq('contractor_name', contractor_name)
        .eq('month', prevMonth)
        .single();

      if (prevError) {
        console.log(`No previous month data found for ${contractor_name} in ${prevMonth}:`, prevError.message);
      } else {
        console.log(`Previous month data for ${contractor_name}:`, prevData);
      }

      const carry_forward = prevData?.balance || 0;
      
      console.log(`✓ Carry forward: ₹${carry_forward}, New payable: ₹${total_payable}, Initial balance: ₹${carry_forward + parseFloat(total_payable)}`);

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
        console.error(`Failed to create payable record:`, insertError);
        throw insertError;
      }
      
      console.log(`✓ Created new payable record:`, newData);

      return NextResponse.json(newData, { status: 201 });
    } else if (fetchError) {
      console.error(`Error fetching contractor payment:`, fetchError);
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
