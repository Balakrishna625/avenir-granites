import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch consignments with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const quarry = searchParams.get('quarry');

    let query = supabase
      .from('granite_consignments')
      .select(`
        *,
        granite_suppliers (
          id,
          name
        ),
        granite_blocks (
          id,
          block_no,
          gross_measurement,
          net_measurement,
          status,
          arrival_status
        )
      `)
      .order('purchase_date', { ascending: true });

    // Apply filters
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      query = query.gte('purchase_date', startDate).lte('purchase_date', endDate);
    }

    if (quarry && quarry !== 'all') {
      query = query.eq('quarry_name', quarry);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching consignments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/consignments-new:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new consignment
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();
    const {
      purchase_date,
      quarry_name,
      total_blocks_count,
      net_measurement,
      purchase_cost_rate,
      total_gross_measurement,
      transport_cost,
      loading_cost,
      quarry_commission,
      other_charges,
      blocks
    } = body;

    // Validate required fields
    if (!purchase_date || !quarry_name || !blocks || blocks.length === 0 || !net_measurement) {
      return NextResponse.json(
        { error: 'Missing required fields: purchase_date, quarry_name, net_measurement, and blocks' },
        { status: 400 }
      );
    }

    // Get supplier_id from quarry_name
    const { data: supplier, error: supplierError } = await supabase
      .from('granite_suppliers')
      .select('id')
      .eq('name', quarry_name)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Invalid quarry name' }, { status: 400 });
    }

    // Generate consignment number (format: CSG-YYYYMMDD-XXX)
    const date = new Date(purchase_date);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of consignments for this date
    const { count } = await supabase
      .from('granite_consignments')
      .select('*', { count: 'exact', head: true })
      .gte('purchase_date', date.toISOString().slice(0, 10))
      .lt('purchase_date', new Date(date.getTime() + 86400000).toISOString().slice(0, 10));

    const consignmentNumber = `CSG-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

    // Create consignment
    const { data: consignment, error: consignmentError } = await supabase
      .from('granite_consignments')
      .insert({
        consignment_number: consignmentNumber,
        supplier_id: supplier.id,
        quarry_name,
        purchase_date,
        arrival_date: purchase_date, // Keep for backward compatibility
        total_blocks_count: total_blocks_count || blocks.length,
        net_measurement: net_measurement || 0,
        purchase_cost_rate: purchase_cost_rate || 0,
        total_gross_measurement: total_gross_measurement || 0,
        transport_cost: transport_cost || 0,
        loading_cost: loading_cost || 0,
        quarry_commission: quarry_commission || 0,
        other_charges: other_charges || 0,
        // Keep old fields for backward compatibility
        total_net_measurement: net_measurement || 0,
        purchase_cost: 0
      })
      .select()
      .single();

    if (consignmentError) {
      console.error('Error creating consignment:', consignmentError);
      return NextResponse.json({ error: consignmentError.message }, { status: 500 });
    }

    // Create blocks with optional net_measurement
    const blocksToInsert = blocks.map((block: any) => ({
      consignment_id: consignment.id,
      block_no: block.block_name.toUpperCase(),
      gross_measurement: parseFloat(block.gross_measurement) || 0,
      net_measurement: parseFloat(block.net_measurement) || 0, // Optional field per block
      grade: block.grade || 'A',
      status: 'RAW'
    }));

    const { error: blocksError } = await supabase
      .from('granite_blocks')
      .insert(blocksToInsert);

    if (blocksError) {
      console.error('Error creating blocks:', blocksError);
      // Rollback consignment if blocks creation fails
      await supabase.from('granite_consignments').delete().eq('id', consignment.id);
      return NextResponse.json({ error: blocksError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, consignment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/consignments-new:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update consignment
export async function PUT(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();
    const { id, blocks, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Consignment ID is required' }, { status: 400 });
    }

    // If quarry_name is updated, update supplier_id too
    if (updateData.quarry_name) {
      const { data: supplier, error: supplierError } = await supabase
        .from('granite_suppliers')
        .select('id')
        .eq('name', updateData.quarry_name)
        .single();

      if (supplierError || !supplier) {
        return NextResponse.json({ error: 'Invalid quarry name' }, { status: 400 });
      }

      updateData.supplier_id = supplier.id;
    }

    // If net_measurement is provided, keep total_net_measurement in sync for backward compatibility
    if (updateData.net_measurement !== undefined) {
      updateData.total_net_measurement = updateData.net_measurement;
    }

    const { data, error } = await supabase
      .from('granite_consignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating consignment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update blocks if provided
    if (blocks && blocks.length > 0) {
      // Delete existing blocks
      await supabase
        .from('granite_blocks')
        .delete()
        .eq('consignment_id', id);

      // Insert new blocks with optional net_measurement
      const blocksToInsert = blocks.map((block: any) => ({
        consignment_id: id,
        block_no: block.block_name.toUpperCase(),
        gross_measurement: parseFloat(block.gross_measurement) || 0,
        net_measurement: parseFloat(block.net_measurement) || 0, // Optional field per block
        grade: block.grade || 'A',
        status: 'RAW'
      }));

      const { error: blocksError } = await supabase
        .from('granite_blocks')
        .insert(blocksToInsert);

      if (blocksError) {
        console.error('Error updating blocks:', blocksError);
        return NextResponse.json({ error: blocksError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, consignment: data });
  } catch (error) {
    console.error('Error in PUT /api/consignments-new:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete consignment
export async function DELETE(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Consignment ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('granite_consignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting consignment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/consignments-new:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
