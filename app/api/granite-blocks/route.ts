import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const consignmentId = searchParams.get('consignment_id');

    let query = supabase
      .from('granite_blocks')
      .select(`
        id,
        consignment_id,
        block_no,
        grade,
        gross_measurement,
        net_measurement,
        marker_measurement,
        allowance,
        elavance,
        total_sqft,
        total_slabs,
        status,
        granite_consignments!inner(
          consignment_number,
          granite_suppliers!inner(
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (consignmentId) {
      query = query.eq('consignment_id', consignmentId);
    }

    const { data: blocks, error } = await query;

    if (error) {
      console.error('Error fetching blocks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to flatten the nested structure
    const transformedBlocks = blocks?.map((block: any) => ({
      id: block.id,
      consignment_id: block.consignment_id,
      block_no: block.block_no,
      grade: block.grade,
      gross_measurement: block.gross_measurement,
      net_measurement: block.net_measurement,
      marker_measurement: block.marker_measurement,
      allowance: block.allowance,
      elavance: block.elavance,
      total_sqft: block.total_sqft,
      total_slabs: block.total_slabs,
      status: block.status,
      consignment_number: block.granite_consignments?.consignment_number || '',
      supplier_name: block.granite_consignments?.granite_suppliers?.name || ''
    })) || [];

    return NextResponse.json(transformedBlocks);
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
    const { 
      consignment_id, 
      block_no, 
      grade, 
      gross_measurement, 
      net_measurement 
    } = body;

    const { data, error } = await supabase
      .from('granite_blocks')
      .insert({
        consignment_id,
        block_no,
        grade,
        gross_measurement,
        net_measurement,
        // default marker = net on creation; can edit later
        marker_measurement: net_measurement,
        status: 'RAW'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating block:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}