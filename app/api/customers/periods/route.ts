import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');

    let query = supabaseAdmin
      .from('customer_account_periods')
      .select(`
        *,
        customer:customers(name)
      `)
      .order('settlement_date', { ascending: false, nullsFirst: false })
      .order('end_date', { ascending: false });

    // Filter by customer if specified
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching customer periods:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer periods' },
        { status: 500 }
      );
    }

    // Transform the data to include customer name
    const transformedData = data.map(period => ({
      ...period,
      customer_name: period.customer?.name || 'Unknown Customer'
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in periods API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
