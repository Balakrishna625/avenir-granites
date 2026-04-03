import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST - Reset contractor payment to auto-calculation mode
 * Sets manually_adjusted = false so the system will auto-calculate payable amounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractor_name, month } = body;

    if (!contractor_name || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the record to remove manual adjustment flag
    const { data, error } = await supabaseAdmin
      .from('contractor_payments')
      .update({ 
        manually_adjusted: false
      })
      .eq('contractor_name', contractor_name)
      .eq('month', month)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Reset ${contractor_name} in ${month} to auto-calculation mode`);

    return NextResponse.json({ 
      success: true, 
      message: 'Reset to auto-calculation successfully',
      data 
    });
  } catch (error: any) {
    console.error('Error resetting to auto-calculation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
