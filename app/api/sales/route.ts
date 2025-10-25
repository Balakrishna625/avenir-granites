import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - List all sales with customer and items
export async function GET(request: Request) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    let query = supabase
      .from('sales')
      .select(`
        *,
        customers (
          id,
          name
        ),
        sale_items (
          id,
          material_type_id,
          material_name,
          slabs_count,
          square_feet,
          rate_per_sqft,
          total_amount,
          remarks
        )
      `)
      .order('sale_date', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

// POST - Create new sale with items and optional consignment creation
export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();
    
    const {
      customer_id,
      sale_date,
      items, // Array of line items
      tax_amount = 0,
      mining_amount = 0,
      loading_amount = 0,
      official_bill_items = [],
      official_tax = 0,
      rtgs_expected = 0,
      cash_expected = 0,
      remarks = '',
      createConsignment = true // Default to true for backward compatibility
    } = body;

    // Validation
    if (!customer_id || !sale_date || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, sale_date, and items are required' },
        { status: 400 }
      );
    }

    // Calculate totals from items
    let total_slabs = 0;
    let total_sqft = 0;
    let subtotal_amount = 0;

    items.forEach((item: any) => {
      total_slabs += Number(item.slabs_count) || 0;
      total_sqft += Number(item.square_feet) || 0;
      subtotal_amount += Number(item.total_amount) || 0;
    });

    const gross_total = subtotal_amount + Number(tax_amount) + Number(mining_amount) + Number(loading_amount);

    // Calculate official bill total
    const official_subtotal = official_bill_items.reduce((sum: number, item: any) => sum + (Number(item.total_amount) || 0), 0);
    const official_total = official_subtotal + Number(official_tax);

    // Validate payment split
    const payment_total = Number(rtgs_expected) + Number(cash_expected);
    if (Math.abs(payment_total - gross_total) > 0.01) {
      return NextResponse.json(
        { error: `Payment split (₹${payment_total.toFixed(2)}) must equal gross total (₹${gross_total.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Generate sale number
    const { data: saleNumberData, error: saleNumberError } = await supabase
      .rpc('generate_sale_number');

    if (saleNumberError) {
      console.error('Error generating sale number:', saleNumberError);
      return NextResponse.json({ error: 'Failed to generate sale number' }, { status: 500 });
    }

    const sale_number = saleNumberData;

    // Start transaction by creating sale first
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_number,
        customer_id,
        sale_date,
        total_slabs,
        total_sqft,
        subtotal_amount,
        tax_amount: Number(tax_amount),
        mining_amount: Number(mining_amount),
        loading_amount: Number(loading_amount),
        gross_total,
        official_bill_items,
        official_tax: Number(official_tax),
        official_total,
        rtgs_expected: Number(rtgs_expected),
        cash_expected: Number(cash_expected),
        remarks
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale:', saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    // Insert sale items
    const itemsToInsert = items.map((item: any) => ({
      sale_id: saleData.id,
      material_type_id: item.material_type_id || null,
      material_name: item.material_name,
      slabs_count: Number(item.slabs_count) || 0,
      square_feet: Number(item.square_feet) || 0,
      rate_per_sqft: Number(item.rate_per_sqft) || 0,
      total_amount: Number(item.total_amount) || 0,
      remarks: item.remarks || ''
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating sale items:', itemsError);
      // Rollback sale
      await supabase.from('sales').delete().eq('id', saleData.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Conditionally create consignment based on createConsignment flag
    if (createConsignment) {
      const consignmentRemarks = `Auto-created from ${sale_number}${remarks ? ' - ' + remarks : ''}`;
      
      const { data: consignmentData, error: consignmentError } = await supabase
        .from('consignments')
        .insert({
          customer_id,
          date: sale_date,
          remarks: consignmentRemarks,
          total: gross_total,
          rtgs_expected: Number(rtgs_expected),
          cash_expected: Number(cash_expected),
          payment_received: 0,
          balance: gross_total
        })
        .select()
        .single();

      if (consignmentError) {
        console.error('Error creating consignment:', consignmentError);
        // Rollback sale and items
        await supabase.from('sales').delete().eq('id', saleData.id);
        return NextResponse.json({ error: 'Failed to create consignment' }, { status: 500 });
      }

      // Link consignment to sale
      const { error: updateError } = await supabase
        .from('sales')
        .update({ consignment_id: consignmentData.id })
        .eq('id', saleData.id);

      if (updateError) {
        console.error('Error linking consignment to sale:', updateError);
      }
    }

    // Fetch complete sale with items
    const { data: completeSale } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          id,
          name
        ),
        sale_items (
          *
        )
      `)
      .eq('id', saleData.id)
      .single();

    return NextResponse.json(completeSale);
  } catch (error) {
    console.error('Unexpected error in POST /api/sales:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
