import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST - Add a payment transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractor_name, month, payment_date, amount, payment_mode, notes } = body;

    if (!contractor_name || !month || !payment_date || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get contractor payment record
    const { data: contractorPayment, error: fetchError } = await supabaseAdmin
      .from('contractor_payments')
      .select('id')
      .eq('contractor_name', contractor_name)
      .eq('month', month)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Contractor payment record not found' }, { status: 404 });
    }

    // Insert transaction
    const { data, error } = await supabaseAdmin
      .from('contractor_payment_transactions')
      .insert({
        contractor_payment_id: contractorPayment.id,
        payment_date,
        amount: parseFloat(amount),
        payment_mode,
        notes
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error adding payment transaction:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
