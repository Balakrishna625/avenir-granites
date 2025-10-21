import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


export async function DELETE() {
  try {
    // Delete all line polish reports
    const { error: reportsError } = await supabaseAdmin
      .from('line_polish_reports')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (reportsError) {
      console.error('Error deleting reports:', reportsError);
      return NextResponse.json({ error: reportsError.message }, { status: 500 });
    }

    // Delete all line polish payments
    const { error: paymentsError } = await supabaseAdmin
      .from('line_polish_payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (paymentsError) {
      console.error('Error deleting payments:', paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // Delete all monthly balances
    const { error: balancesError } = await supabaseAdmin
      .from('line_polish_monthly_balances')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (balancesError) {
      console.error('Error deleting balances:', balancesError);
      return NextResponse.json({ error: balancesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'All line polish data cleared successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
