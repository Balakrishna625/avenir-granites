import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const accountId = searchParams.get('account_id');

    let query = supabaseAdmin
      .from('bank_transfers')
      .select('*, bank_accounts:from_account_id(name)')
      .order('date', { ascending: false });

    if (from) {
      query = query.gte('date', from);
    }

    if (to) {
      query = query.lte('date', to);
    }

    if (accountId) {
      query = query.eq('from_account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bank transfers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/bank-transfers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, from_account_id, amount, to_description, notes } = body;

    if (!date || !from_account_id || !amount || !to_description) {
      return NextResponse.json(
        { error: 'Missing required fields: date, from_account_id, amount, to_description' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('bank_transfers')
      .insert({
        date,
        from_account_id,
        amount: parseFloat(amount),
        to_description,
        notes: notes || null
      })
      .select('*, bank_accounts:from_account_id(name)')
      .single();

    if (error) {
      console.error('Error creating bank transfer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/bank-transfers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing transfer ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('bank_transfers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bank transfer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/bank-transfers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
