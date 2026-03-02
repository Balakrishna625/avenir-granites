import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET: Fetch settlement records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build the query
    let query = supabaseAdmin
      .from('customer_account_periods')
      .select(`
        id,
        customer_id,
        settlement_date,
        settlement_amount,
        settlement_mode,
        settlement_reference,
        settlement_notes,
        customers:customer_id(name)
      `)
      .eq('is_active', false) // Only settled periods
      .not('settlement_amount', 'is', null) // Must have settlement amount
      .gt('settlement_amount', 0) // Must be > 0
      .order('settlement_date', { ascending: false });

    // Apply date filters if provided
    if (from) {
      query = query.gte('settlement_date', from);
    }
    if (to) {
      query = query.lte('settlement_date', to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching settlements:', error);
      return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in settlements API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
