import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch single sale with all details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    const { data, error } = await supabase
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
          tons,
          rate_per_ton,
          is_tonnage_material,
          total_amount,
          remarks
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching sale:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in GET /api/sales/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}

// PUT - Update existing sale
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();
    
    const {
      customer_id,
      sale_date,
      items,
      tax_amount = 0,
      mining_amount = 0,
      loading_amount = 0,
      official_bill_items = [],
      official_tax = 0,
      end_customer_name = null,
      factory_mining_rate = null,
      factory_mining_amount = null,
      factory_gst_amount = null,
      rtgs_expected = 0,
      cash_expected = 0,
      remarks = '',
      onlyBill = false, // Only bill mode
      externalPurchase = false // External purchase - excluded from factory stats
    } = body;

    // Validation - different rules for onlyBill mode
    if (onlyBill) {
      // Only bill mode: require customer, date and official bill items
      if (!customer_id || !sale_date || !official_bill_items || official_bill_items.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields: customer_id, sale_date and official_bill_items are required for Only Bill mode' },
          { status: 400 }
        );
      }
    } else {
      // Normal mode: require customer and items
      if (!customer_id || !sale_date || !items || items.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields: customer_id, sale_date, and items are required' },
          { status: 400 }
        );
      }
    }

    // Calculate totals from items
    let total_slabs = 0;
    let total_sqft = 0;
    let total_tons = 0;
    let subtotal_amount = 0;

    // Only calculate from items if not onlyBill mode
    if (!onlyBill && items && items.length > 0) {
      items.forEach((item: any) => {
        if (item.is_tonnage_material) {
          total_tons += Number(item.tons) || 0;
          // Tonnage materials can also have square feet now
          total_sqft += Number(item.square_feet) || 0;
        } else {
          total_slabs += Number(item.slabs_count) || 0;
          total_sqft += Number(item.square_feet) || 0;
        }
        subtotal_amount += Number(item.total_amount) || 0;
      });
    }

    const gross_total = subtotal_amount + Number(tax_amount) + Number(mining_amount) + Number(loading_amount);

    // Calculate official bill total
    const official_subtotal = official_bill_items.reduce((sum: number, item: any) => sum + (Number(item.total_amount) || 0), 0);
    const official_total = official_subtotal + Number(official_tax);

    // Validate payment split only if not onlyBill mode
    if (!onlyBill) {
      const payment_total = Number(rtgs_expected) + Number(cash_expected);
      if (Math.abs(payment_total - Math.round(gross_total)) > 1) {
        return NextResponse.json(
          { error: `Payment split (₹${payment_total.toFixed(2)}) must equal gross total (₹${gross_total.toFixed(2)})` },
          { status: 400 }
        );
      }
    }

    // Update sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .update({
        customer_id: onlyBill ? null : customer_id,
        sale_date,
        total_slabs,
        total_sqft,
        total_tons,
        subtotal_amount,
        tax_amount: Number(tax_amount),
        mining_amount: Number(mining_amount),
        loading_amount: Number(loading_amount),
        gross_total,
        official_bill_items,
        official_tax: Number(official_tax),
        end_customer_name,
        official_total,
        factory_mining_rate: factory_mining_rate !== null ? Number(factory_mining_rate) : null,
        factory_mining_amount: factory_mining_amount !== null ? Number(factory_mining_amount) : null,
        factory_gst_amount: factory_gst_amount !== null ? Number(factory_gst_amount) : null,
        rtgs_expected: Number(rtgs_expected),
        cash_expected: Number(cash_expected),
        remarks,
        only_bill: onlyBill,
        external_purchase: externalPurchase,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (saleError) {
      console.error('Error updating sale:', saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    // Delete existing sale items
    const { error: deleteError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (deleteError) {
      console.error('Error deleting old sale items:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new sale items only if not onlyBill mode
    if (!onlyBill && items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        sale_id: id,
        material_type_id: item.material_type_id || null,
        material_name: item.material_name,
        slabs_count: Number(item.slabs_count) || 0,
        square_feet: Number(item.square_feet) || 0,
        rate_per_sqft: Number(item.rate_per_sqft) || 0,
        tons: Number(item.tons) || 0,
        rate_per_ton: Number(item.rate_per_ton) || 0,
        is_tonnage_material: Boolean(item.is_tonnage_material),
        total_amount: Number(item.total_amount) || 0,
        remarks: item.remarks || ''
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error inserting sale items:', itemsError);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }

    // Update linked consignment if it exists and not onlyBill mode
    const { data: existingSale } = await supabase
      .from('sales')
      .select('consignment_id')
      .eq('id', id)
      .single();

    if (!onlyBill && existingSale?.consignment_id) {
      const consignmentRemarks = `Auto-created from ${saleData.sale_number}${remarks ? ' - ' + remarks : ''}`;
      
      const { error: consignmentError } = await supabase
        .from('consignments')
        .update({
          customer_id,
          date: sale_date,
          total: gross_total,
          rtgs_expected: Number(rtgs_expected),
          cash_expected: Number(cash_expected),
          remarks: consignmentRemarks
        })
        .eq('id', existingSale.consignment_id);

      if (consignmentError) {
        console.error('Error updating linked consignment:', consignmentError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Fetch updated sale with items
    const { data: updatedSale, error: fetchError } = await supabase
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
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated sale:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error('Unexpected error in PUT /api/sales/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update sale' },
      { status: 500 }
    );
  }
}

// DELETE - Delete sale and related items
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    // First, check if sale exists and get details for consignment cleanup
    const { data: saleData, error: fetchError } = await supabase
      .from('sales')
      .select('customer_id, sale_number, gross_total')
      .eq('id', id)
      .single();

    if (fetchError || !saleData) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Delete sale_items (cascade should handle this, but explicit is safer)
    const { error: itemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (itemsError) {
      console.error('Error deleting sale items:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Delete the sale
    const { error: saleError } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (saleError) {
      console.error('Error deleting sale:', saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    // Delete associated consignment that was auto-created from this sale
    // Look for consignment with matching sale number in remarks
    const { error: consignmentError } = await supabase
      .from('consignments')
      .delete()
      .ilike('remarks', `%Auto-created from ${saleData.sale_number}%`);

    if (consignmentError) {
      console.warn('Error deleting associated consignment:', consignmentError);
      // Don't fail the entire operation if consignment deletion fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Sale deleted successfully',
      deletedSaleNumber: saleData.sale_number
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/sales/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    );
  }
}
