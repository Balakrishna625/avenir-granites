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

    const { data: consignments, error } = await supabase
      .from('granite_consignments')
      .select(`
        id,
        consignment_number,
        arrival_date,
        total_blocks,
        total_net_measurement,
        total_gross_measurement,
        total_expenditure,
        total_sqft_produced,
        total_cost_per_sqft,
        status,
        granite_suppliers!inner (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consignments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to flatten the nested structure
    const transformedConsignments = consignments?.map((consignment: any) => ({
      id: consignment.id,
      consignment_number: consignment.consignment_number,
      supplier_name: Array.isArray(consignment.granite_suppliers) 
        ? consignment.granite_suppliers[0]?.name || 'Unknown Supplier'
        : consignment.granite_suppliers?.name || 'Unknown Supplier',
      arrival_date: consignment.arrival_date,
      total_blocks: consignment.total_blocks,
      total_net_measurement: consignment.total_net_measurement,
      total_gross_measurement: consignment.total_gross_measurement,
      total_expenditure: consignment.total_expenditure,
      total_sqft_produced: consignment.total_sqft_produced,
      total_cost_per_sqft: consignment.total_cost_per_sqft,
      status: consignment.status
    })) || [];

    return NextResponse.json(transformedConsignments);
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

    const { data: consignment, error } = await supabase
      .from('granite_consignments')
      .insert({
        consignment_number: body.consignment_number,
        supplier_id: body.supplier_id,
        arrival_date: body.arrival_date,
        rate_per_meter: body.rate_per_meter || 30000,
        payment_cash_rate: body.payment_cash_rate || 19000,
        payment_upi_rate: body.payment_upi_rate || 11000,
        transport_cost: body.transport_cost || 0,
        production_cost_per_sqft: body.production_cost_per_sqft || 40,
        notes: body.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating consignment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(consignment, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}