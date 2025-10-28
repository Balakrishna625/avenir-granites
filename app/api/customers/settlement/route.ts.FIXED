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

    // BUG FIX (2025-10-28): Removed duplicate transaction creation
    // Problem: Creating a transaction here caused:
    // 1. Double-counting in total_received (settlement amount added twice)
    // 2. Duplicate RTGS transaction appearing on current page after settlement
    // 3. Incorrect settlement history data
    // 
    // Solution: The database function settle_customer_account() already records
    // the settlement_amount in the customer_account_periods table. We don't need
    // to create a separate transaction record here.
    //
    // REMOVED CODE (Lines 82-100):
    // if (settlementAmount > 0 && settlementMode !== 'PARTIAL_WAIVER') {
    //   const { data: accounts } = await supabaseAdmin
    //     .from('bank_accounts')
    //     .select('id')
    //     .limit(1);
    //   if (accounts && accounts.length > 0) {
    //     await supabaseAdmin.from('transactions').insert({
    //       customer_id: customerId,
    //       date: new Date().toISOString().split('T')[0],
    //       mode: settlementMode === 'CASH' ? 'CASH' : 'RTGS',
    //       account_id: accounts[0].id,
    //       amount: settlementAmount,
    //       note: `Settlement payment - ${settlementNotes || 'Account settled'}`
    //     });
    //   }
    // }

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

// PUT: Edit settlement history record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      periodId,
      totalInvoiced,
      totalReceived,
      totalPending,
      oldDueAmount,
      waivedAmount,
      settlementAmount,
      settlementMode,
      settlementReference,
      settlementNotes
    } = body;

    // Validation
    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    // Call the edit settlement history function
    const { data, error } = await supabaseAdmin.rpc('edit_settlement_history', {
      p_period_id: periodId,
      p_total_invoiced: totalInvoiced || null,
      p_total_received: totalReceived || null,
      p_total_pending: totalPending || null,
      p_old_due_amount: oldDueAmount || null,
      p_waived_amount: waivedAmount || null,
      p_settlement_amount: settlementAmount || null,
      p_settlement_mode: settlementMode || null,
      p_settlement_reference: settlementReference || null,
      p_settlement_notes: settlementNotes || null
    });

    if (error) {
      console.error('Error editing settlement history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if the function returned an error
    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Settlement history updated successfully',
      data
    });
  } catch (error) {
    console.error('Error in edit settlement history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete settlement history record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

    // Validation
    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    // Call the delete settlement history function
    const { data, error } = await supabaseAdmin.rpc('delete_settlement_history', {
      p_period_id: periodId
    });

    if (error) {
      console.error('Error deleting settlement history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if the function returned an error
    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Settlement history deleted successfully',
      data
    });
  } catch (error) {
    console.error('Error in delete settlement history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
