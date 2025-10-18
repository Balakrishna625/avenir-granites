import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch all waived transactions for a customer
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('waived_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('waived_date', { ascending: false });

    if (error) {
      console.error('Error fetching waived transactions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/waived-transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new waived transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, amount, waived_date, notes } = body;

    // Validation
    if (!customer_id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    if (amount === undefined || amount === null || isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: 'Valid amount is required (must be >= 0)' }, { status: 400 });
    }

    if (!waived_date) {
      return NextResponse.json({ error: 'Waived date is required' }, { status: 400 });
    }

    // Insert the waived transaction
    const { data, error } = await supabaseAdmin
      .from('waived_transactions')
      .insert({
        customer_id,
        amount: parseFloat(amount),
        waived_date,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating waived transaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/waived-transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an existing waived transaction
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, amount, waived_date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    
    if (amount !== undefined && amount !== null) {
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json({ error: 'Amount must be >= 0' }, { status: 400 });
      }
      updateData.amount = parseFloat(amount);
    }

    if (waived_date !== undefined) {
      updateData.waived_date = waived_date;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data, error } = await supabaseAdmin
      .from('waived_transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating waived transaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/waived-transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a waived transaction
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('waived_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting waived transaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/waived-transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
