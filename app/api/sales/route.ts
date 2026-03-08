import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - List all sales with customer and items
export async function GET(request: Request) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const customer_id = searchParams.get('customer_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const only_bill = searchParams.get('only_bill');

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
          tons,
          rate_per_ton,
          is_tonnage_material,
          total_amount,
          remarks
        )
      `)
      .order('sale_date', { ascending: false });

    if (customerId || customer_id) {
      query = query.eq('customer_id', customerId || customer_id);
    }

    // Filter by only_bill if requested
    if (only_bill === 'true') {
      query = query.eq('only_bill', true);
    }

    // Filter by month and year if provided
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;
      
      // Calculate last day of month
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      const endDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
      
      query = query.gte('sale_date', startDate).lte('sale_date', endDate);
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
      end_customer_name = null,
      factory_mining_rate = null,
      factory_mining_amount = null,
      factory_gst_amount = null,
      rtgs_expected = 0,
      cash_expected = 0,
      remarks = '',
      createConsignment = true, // Default to true for backward compatibility
      onlyBill = false, // Only bill mode - no actual sale
      jobWork = false // Job work mode - polishing service
    } = body;

    // Validation - different rules for onlyBill and jobWork modes
    if (onlyBill) {
      // Only bill mode: only require date and official bill items
      if (!sale_date || !official_bill_items || official_bill_items.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields: sale_date and official_bill_items are required for bill-only sales' },
          { status: 400 }
        );
      }
    } else if (jobWork) {
      // Job work mode: require customer, date, and at least one item
      if (!customer_id || !sale_date || !items || items.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields: customer_id, sale_date, and items are required for job work' },
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
          // For job work, we don't count slabs, only sqft
          if (!jobWork) {
            total_slabs += Number(item.slabs_count) || 0;
          }
          total_sqft += Number(item.square_feet) || 0;
        }
        subtotal_amount += Number(item.total_amount) || 0;
      });
    }

    const gross_total = subtotal_amount + Number(tax_amount) + Number(mining_amount) + Number(loading_amount);

    // Calculate official bill total
    const official_subtotal = official_bill_items.reduce((sum: number, item: any) => sum + (Number(item.total_amount) || 0), 0);
    const official_total = official_subtotal + Number(official_tax);

    // Validate payment split only if not onlyBill or jobWork mode
    // Job work amounts are added to customer payable, not paid immediately
    if (!onlyBill && !jobWork) {
      const payment_total = Number(rtgs_expected) + Number(cash_expected);
      if (Math.abs(payment_total - Math.round(gross_total)) > 1) {
        return NextResponse.json(
          { error: `Payment split (₹${payment_total.toFixed(2)}) must equal gross total (₹${gross_total.toFixed(2)})` },
          { status: 400 }
        );
      }
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
        customer_id: customer_id,
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
        job_work: jobWork
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale:', saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    // Insert sale items only if not onlyBill mode
    if (!onlyBill && items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        sale_id: saleData.id,
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
        console.error('Error creating sale items:', itemsError);
        // Rollback sale
        await supabase.from('sales').delete().eq('id', saleData.id);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }

    // Create consignment for all entry types that have a customer
    // - Normal sales: creates consignment if createConsignment is true
    // - Job Work: always creates consignment (service charges are customer liability)
    // - Only Bill: always creates consignment (official bill amount is customer liability)
    if (createConsignment || jobWork || onlyBill) {
      const consignmentRemarks = `Auto-created from ${sale_number}${remarks ? ' - ' + remarks : ''}`;
      
      // For Only Bill mode, use official_total as the consignment amount
      // Calculate official_total = official_bill_items subtotal + official_tax
      let consignmentTotal = gross_total;
      let consignmentRtgs = Number(rtgs_expected);
      let consignmentCash = Number(cash_expected);
      
      if (onlyBill) {
        // For Only Bill, liability is Official Total (RTGS amount = what customer was billed)
        const officialSubtotal = official_bill_items.reduce((sum: number, item: any) => {
          const sqft = Number(item.square_feet) || 0;
          const rate = Number(item.rate_per_sqft) || 0;
          return sum + (sqft * rate);
        }, 0);
        consignmentTotal = officialSubtotal + (Number(official_tax) || 0);
        consignmentRtgs = consignmentTotal;
        consignmentCash = 0;
      }
      
      // Determine entry type for consignment
      let entryType = 'sales'; // default
      if (onlyBill) entryType = 'only_bill';
      if (jobWork) entryType = 'job_work';
      
      const { data: consignmentData, error: consignmentError } = await supabase
        .from('consignments')
        .insert({
          customer_id,
          date: sale_date,
          remarks: consignmentRemarks,
          total: consignmentTotal,
          rtgs_expected: consignmentRtgs,
          cash_expected: consignmentCash,
          payment_received: 0,
          balance: consignmentTotal,
          entry_type: entryType
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
