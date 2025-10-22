import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let query = supabaseAdmin
      .from('electricity_bills')
      .select('*');

    if (id) {
      query = query.eq('id', id).single();
    } else {
      // Filter by month/year if provided
      if (month && year) {
        const monthYear = `${month.toUpperCase()}-${year}`;
        query = query.eq('bill_month', monthYear);
      }
      
      query = query.order('bill_date', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching electricity bills:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch electricity bills' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Calculate derived fields if not provided
    if (body.kwh_previous && body.kwh_current && !body.kwh_consumption) {
      body.kwh_consumption = body.kwh_current - body.kwh_previous;
    }

    if (body.kvah_previous && body.kvah_current && !body.kvah_consumption) {
      body.kvah_consumption = body.kvah_current - body.kvah_previous;
    }

    const { data, error } = await supabaseAdmin
      .from('electricity_bills')
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating electricity bill:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create electricity bill' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Recalculate derived fields if readings changed
    if (updateData.kwh_previous && updateData.kwh_current) {
      updateData.kwh_consumption = updateData.kwh_current - updateData.kwh_previous;
    }

    if (updateData.kvah_previous && updateData.kvah_current) {
      updateData.kvah_consumption = updateData.kvah_current - updateData.kvah_previous;
    }

    const { data, error } = await supabaseAdmin
      .from('electricity_bills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating electricity bill:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update electricity bill' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('electricity_bills')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting electricity bill:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete electricity bill' },
      { status: 500 }
    );
  }
}
