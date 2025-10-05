import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const consignmentId = url.searchParams.get("id");

    if (consignmentId) {
      const { data, error } = await supabaseAdmin
        .from("granite_consignments")
        .select(`
          *,
          supplier:granite_suppliers(id, name, contact_person),
          blocks:granite_blocks(id, block_no, gross_measurement, net_measurement, elavance, grade, status)
        `)
        .eq("id", consignmentId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabaseAdmin
        .from("granite_consignments")
        .select(`*, supplier:granite_suppliers(id, name, contact_person)`)
        .order("arrival_date", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { consignment_number, supplier_id, arrival_date, payment_cash = 0, payment_upi = 0, transport_cost = 0, notes } = body;

    console.log('Creating consignment with data:', body); // Debug log

    if (!consignment_number || !supplier_id || !arrival_date) {
      return NextResponse.json({ error: "Required fields missing: consignment_number, supplier_id, and arrival_date are required" }, { status: 400 });
    }

    // Check if supplier exists, if not create fallback suppliers
    let { data: supplier, error: supplierError } = await supabaseAdmin
      .from("granite_suppliers")
      .select("id, name")
      .eq("id", supplier_id)
      .single();

    if (supplierError || !supplier) {
      console.log('Supplier not found, checking for fallback supplier creation');
      
      // Try to create fallback suppliers if this is a known fallback ID
      const fallbackSuppliers = [
        { id: 'supplier-1', name: 'Rising Sun Exports', contact_person: 'Manager' },
        { id: 'supplier-2', name: 'Bargandy Quarry', contact_person: 'Sales Head' },
        { id: 'supplier-3', name: 'Local Granite Quarry', contact_person: 'Owner' }
      ];
      
      const fallbackSupplier = fallbackSuppliers.find(s => s.id === supplier_id);
      if (fallbackSupplier) {
        // Try to create the supplier
        const { data: newSupplier, error: createError } = await supabaseAdmin
          .from("granite_suppliers")
          .upsert({
            id: fallbackSupplier.id,
            name: fallbackSupplier.name,
            contact_person: fallbackSupplier.contact_person
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Failed to create fallback supplier:', createError);
          return NextResponse.json({ error: `Supplier with ID ${supplier_id} not found and could not be created: ${createError.message}` }, { status: 400 });
        }
        supplier = newSupplier;
      } else {
        return NextResponse.json({ error: `Supplier with ID ${supplier_id} not found. Please select a valid supplier.` }, { status: 400 });
      }
    }

    const total_expenditure = parseFloat(payment_cash || 0) + parseFloat(payment_upi || 0) + parseFloat(transport_cost || 0);

    const { data, error } = await supabaseAdmin
      .from("granite_consignments")
      .insert({
        consignment_number,
        supplier_id,
        arrival_date,
        payment_cash: parseFloat(payment_cash || 0),
        payment_upi: parseFloat(payment_upi || 0),
        transport_cost: parseFloat(transport_cost || 0),
        total_expenditure,
        notes,
        status: 'ACTIVE'
      })
      .select(`*, supplier:granite_suppliers(id, name, contact_person)`)
      .single();

    if (error) {
      console.error('Database error:', error); // Debug log
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Server error:', error); // Debug log
    return NextResponse.json({ error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const consignmentId = url.searchParams.get("id");

    if (!consignmentId) {
      return NextResponse.json({ error: "Consignment ID required" }, { status: 400 });
    }

    // First delete all blocks associated with this consignment
    await supabaseAdmin
      .from("granite_blocks")
      .delete()
      .eq("consignment_id", consignmentId);

    // Then delete the consignment
    const { error } = await supabaseAdmin
      .from("granite_consignments")
      .delete()
      .eq("id", consignmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
