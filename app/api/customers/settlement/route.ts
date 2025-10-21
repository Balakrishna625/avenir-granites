import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET: Get settlement history for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Get all periods for this customer
    const { data: periods, error } = await supabaseAdmin
      .from('customer_period_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('period_number', { ascending: false });

    if (error) {
      console.error('Error fetching settlement history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(periods || []);
  } catch (error) {
    console.error('Error in settlement history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Settle customer account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      settlementAmount,
      settlementMode,
      settlementReference,
      settlementNotes,
      waiveRemaining = false,
      settledBy
    } = body;

    // Validation
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    if (!settlementMode) {
      return NextResponse.json({ error: 'Settlement mode is required' }, { status: 400 });
    }

    const validModes = ['RTGS', 'CASH', 'CHEQUE', 'UPI', 'PARTIAL_WAIVER', 'FULL_WAIVER'];
    if (!validModes.includes(settlementMode)) {
      return NextResponse.json({ error: 'Invalid settlement mode' }, { status: 400 });
    }

    // If full waiver, settlement amount should be 0
    if (settlementMode === 'FULL_WAIVER' && settlementAmount > 0) {
      return NextResponse.json({ error: 'Full waiver should have 0 settlement amount' }, { status: 400 });
    }

    // Call the settlement function
    const { data, error } = await supabaseAdmin.rpc('settle_customer_account', {
      p_customer_id: customerId,
      p_settlement_amount: settlementAmount || 0,
      p_settlement_mode: settlementMode,
      p_settlement_reference: settlementReference || null,
      p_settlement_notes: settlementNotes || null,
      p_waive_remaining: waiveRemaining || (settlementMode === 'FULL_WAIVER'),
      p_settled_by: settledBy || 'system'
    });

    if (error) {
      console.error('Error settling customer account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If settlement includes payment, create a transaction record
    if (settlementAmount > 0 && settlementMode !== 'PARTIAL_WAIVER') {
      // Get default bank account
      const { data: accounts } = await supabaseAdmin
        .from('bank_accounts')
        .select('id')
        .limit(1);

      if (accounts && accounts.length > 0) {
        await supabaseAdmin.from('transactions').insert({
          customer_id: customerId,
          date: new Date().toISOString().split('T')[0],
          mode: settlementMode === 'CASH' ? 'CASH' : 'RTGS',
          account_id: accounts[0].id,
          amount: settlementAmount,
          note: `Settlement payment - ${settlementNotes || 'Account settled'}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Customer account settled successfully',
      data
    });
  } catch (error) {
    console.error('Error in settlement API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Edit settlement details
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      periodId,
      settlementAmount,
      settlementMode,
      settlementReference,
      settlementNotes,
      editedBy
    } = body;

    // Validation
    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    // Validate settlement mode if provided
    if (settlementMode) {
      const validModes = ['RTGS', 'CASH', 'CHEQUE', 'UPI', 'PARTIAL_WAIVER', 'FULL_WAIVER'];
      if (!validModes.includes(settlementMode)) {
        return NextResponse.json({ error: 'Invalid settlement mode' }, { status: 400 });
      }
    }

    // Call the edit settlement function
    const { data, error } = await supabaseAdmin.rpc('edit_settlement', {
      p_period_id: periodId,
      p_settlement_amount: settlementAmount || null,
      p_settlement_mode: settlementMode || null,
      p_settlement_reference: settlementReference || null,
      p_settlement_notes: settlementNotes || null,
      p_edited_by: editedBy || 'system'
    });

    if (error) {
      console.error('Error editing settlement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if the function returned an error
    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Settlement updated successfully',
      data
    });
  } catch (error) {
    console.error('Error in edit settlement API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Reverse/delete a settlement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const deletedBy = searchParams.get('deletedBy');

    // Validation
    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    // Call the reverse settlement function
    const { data, error } = await supabaseAdmin.rpc('reverse_settlement', {
      p_period_id: periodId,
      p_user: deletedBy || 'system'
    });

    if (error) {
      console.error('Error reversing settlement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if the function returned an error
    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Settlement reversed successfully',
      data
    });
  } catch (error) {
    console.error('Error in delete settlement API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
