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

    // Update the total_payable for this contractor and month
    const { data, error } = await supabaseAdmin
      .from('contractor_payments')
      .update({ total_payable: parseFloat(total_payable) })
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
