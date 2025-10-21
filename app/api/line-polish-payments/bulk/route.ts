import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payments } = body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: 'Payments array is required' }, { status: 400 });
    }

    // Validate each payment
    const validatedPayments = payments.map((payment: any) => {
      if (!payment.payment_date || !payment.amount) {
        throw new Error('Missing required fields: payment_date or amount');
      }

      return {
        payment_date: payment.payment_date,
        amount: parseFloat(payment.amount) || 0,
        payment_method: payment.payment_method || 'CASH',
        reference_number: payment.reference_number || null,
        remarks: payment.remarks || null,
      };
    });

    // Insert all payments in bulk
    const { data, error } = await supabaseAdmin
      .from('line_polish_payments')
      .insert(validatedPayments)
      .select();

    if (error) {
      console.error('Error inserting payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique months from imported payments
    const months = new Set<string>();
    validatedPayments.forEach(payment => {
      const month = payment.payment_date.slice(0, 7);
      months.add(month);
    });

    // Update monthly balances for all affected months
    for (const month of months) {
      try {
        await fetch(`${request.nextUrl.origin}/api/line-polish-monthly-balances`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month }),
        });
      } catch (err) {
        console.error(`Error updating balance for ${month}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      imported: data.length,
      data,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
