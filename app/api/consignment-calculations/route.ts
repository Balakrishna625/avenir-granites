import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch all consignment calculations
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('consignment_calculations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consignment calculations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch consignment calculations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create a new consignment calculation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['calculation_name', 'total_blocks', 'net_meters_per_block', 'gross_meters_per_block', 'cost_per_meter'];
    const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate percentages
    const percentageFields = ['polish_percentage', 'laputra_percentage', 'whiteline_percentage'];
    for (const field of percentageFields) {
      const value = body[field];
      if (value !== undefined && value !== null && (value < 0 || value > 100)) {
        return NextResponse.json(
          { error: `${field} must be between 0 and 100` },
          { status: 400 }
        );
      }
    }

    // Validate numeric fields
    const numericFields = [
      'total_blocks', 'net_meters_per_block', 'gross_meters_per_block', 'cost_per_meter', 
      'loading_charges', 'transport_charges', 'quarry_commission',
      'polish_percentage', 'laputra_percentage', 'whiteline_percentage',
      'polish_sale_price', 'laputra_sale_price', 'whiteline_sale_price'
    ];
    
    for (const field of numericFields) {
      const value = body[field];
      if (value !== undefined && value !== null && (isNaN(value) || value < 0)) {
        return NextResponse.json(
          { error: `${field} must be a non-negative number` },
          { status: 400 }
        );
      }
    }

    // Insert new calculation
    const { data, error } = await supabaseAdmin
      .from('consignment_calculations')
      .insert([{
        calculation_name: body.calculation_name,
        description: body.description || null,
        total_blocks: parseInt(body.total_blocks),
        net_meters_per_block: parseFloat(body.net_meters_per_block),
        gross_meters_per_block: parseFloat(body.gross_meters_per_block),
        cost_per_meter: parseFloat(body.cost_per_meter),
        loading_charges: parseFloat(body.loading_charges) || 0,
        transport_charges: parseFloat(body.transport_charges) || 0,
        quarry_commission: parseFloat(body.quarry_commission) || 0,
        polish_percentage: parseFloat(body.polish_percentage) || 0,
        laputra_percentage: parseFloat(body.laputra_percentage) || 0,
        whiteline_percentage: parseFloat(body.whiteline_percentage) || 0,
        polish_sale_price: parseFloat(body.polish_sale_price) || 0,
        laputra_sale_price: parseFloat(body.laputra_sale_price) || 0,
        whiteline_sale_price: parseFloat(body.whiteline_sale_price) || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating consignment calculation:', error);
      return NextResponse.json(
        { error: 'Failed to create consignment calculation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Consignment calculation created successfully',
      data 
    }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing consignment calculation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Calculation ID is required for updates' },
        { status: 400 }
      );
    }

    // Validate percentages if they're being updated
    const percentageFields = ['polish_percentage', 'laputra_percentage', 'whiteline_percentage'];
    for (const field of percentageFields) {
      const value = updateData[field];
      if (value !== undefined && value !== null && (value < 0 || value > 100)) {
        return NextResponse.json(
          { error: `${field} must be between 0 and 100` },
          { status: 400 }
        );
      }
    }

    // Validate numeric fields if they're being updated
    const numericFields = [
      'total_blocks', 'avg_meters_per_block', 'cost_per_meter', 
      'loading_charges', 'transport_charges', 'quarry_commission',
      'polish_percentage', 'laputra_percentage', 'whiteline_percentage',
      'polish_sale_price', 'laputra_sale_price', 'whiteline_sale_price'
    ];
    
    for (const field of numericFields) {
      const value = updateData[field];
      if (value !== undefined && value !== null && (isNaN(value) || value < 0)) {
        return NextResponse.json(
          { error: `${field} must be a non-negative number` },
          { status: 400 }
        );
      }
    }

    // Convert string numbers to proper types
    const processedData: any = { ...updateData };
    if (processedData.total_blocks !== undefined) {
      processedData.total_blocks = parseInt(processedData.total_blocks);
    }
    
    const floatFields = [
      'net_meters_per_block', 'gross_meters_per_block', 'cost_per_meter', 'loading_charges', 
      'transport_charges', 'quarry_commission', 'polish_percentage', 
      'laputra_percentage', 'whiteline_percentage', 'polish_sale_price',
      'laputra_sale_price', 'whiteline_sale_price'
    ];
    
    floatFields.forEach(field => {
      if (processedData[field] !== undefined) {
        processedData[field] = parseFloat(processedData[field]);
      }
    });

    const { data, error } = await supabaseAdmin
      .from('consignment_calculations')
      .update(processedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating consignment calculation:', error);
      return NextResponse.json(
        { error: 'Failed to update consignment calculation' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Consignment calculation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Consignment calculation updated successfully',
      data 
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a consignment calculation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Calculation ID is required for deletion' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('consignment_calculations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting consignment calculation:', error);
      return NextResponse.json(
        { error: 'Failed to delete consignment calculation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Consignment calculation deleted successfully' 
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}