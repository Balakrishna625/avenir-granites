import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json([]);
    }
    const { data: sales, error } = await supabase
      .from('granite_sales')
      .select(`
        id,
        sale_number,
        block_part_id,
        consignment_id,
        block_no,
        part_name,
        buyer_name,
        sale_date,
        sqft_sold,
        rate_per_sqft,
        total_selling_price,
        cost_per_sqft,
        profit_per_sqft,
        total_profit,
        payment_mode,
        notes
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(sales || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const body = await request.json();
    
    // Generate sale number
    const { data: saleNumberResult } = await supabase
      .rpc('generate_sale_number');
    
    const saleData = {
      ...body,
      sale_number: saleNumberResult || `GS-${Date.now()}`
    };

    const { data: sale, error } = await supabase
      .from('granite_sales')
      .insert(saleData)
      .select()
      .single();

    if (error) {
      console.error('Error creating sale:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update the block part's sold_sqft
    // First get the current sold_sqft
    const { data: currentPart } = await supabase
      .from('granite_block_parts')
      .select('sold_sqft')
      .eq('id', body.block_part_id)
      .single();

    if (currentPart) {
      await supabase
        .from('granite_block_parts')
        .update({
          sold_sqft: (currentPart.sold_sqft || 0) + body.sqft_sold
        })
        .eq('id', body.block_part_id);
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}