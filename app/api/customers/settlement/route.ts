import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

║        Print this and check off as you go!                   ║

╚══════════════════════════════════════════════════════════════╝// GET: Get settlement history for a customer

export async function GET(request: NextRequest) {

PHASE 1: INVESTIGATION (5 min)  try {

------------------------------    const { searchParams } = new URL(request.url);

□ Opened Supabase SQL Editor    const customerId = searchParams.get('customerId');

□ Ran Query 1 - Settled Accounts

   Result: _____ rows    if (!customerId) {

□ Ran Query 2 - Settlement Transactions        return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });

   Result: _____ rows    }

□ Ran Query 3 - Waived Amounts

   Result: _____ rows    // Get all periods for this customer

    const { data: periods, error } = await supabaseAdmin

PHASE 2: BACKUP (2 min)      .from('customer_period_history')

-----------------------      .select('*')

□ Ran backup SQL script in Supabase      .eq('customer_id', customerId)

□ Confirmed backups created (saw row counts)      .order('period_number', { ascending: false });

□ Wrote down backup table names:

   - customer_account_periods_backup_20251028    if (error) {

   - customers_backup_20251028      console.error('Error fetching settlement history:', error);

   - transactions_backup_20251028      return NextResponse.json({ error: error.message }, { status: 500 });

   - waived_transactions_backup_20251028    }



PHASE 3: CODE FIX (ALREADY DONE! ✅)    return NextResponse.json(periods || []);

------------------------------------  } catch (error) {

□ Code has been automatically fixed    console.error('Error in settlement history API:', error);

□ File: app/api/customers/settlement/route.ts    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

□ Change: Commented out duplicate transaction creation  }

□ Comments added explaining the fix}



PHASE 4: TEST (5 min)// POST: Settle customer account

---------------------export async function POST(request: NextRequest) {

□ Ran: npm run build  try {

□ Saw: "Compiled successfully" message    const body = await request.json();

□ Opened application in browser    const {

□ Verified customer pages load correctly      customerId,

□ No errors in console      settlementAmount,

      settlementMode,

PHASE 5: VERIFY (Optional)      settlementReference,

--------------------------      settlementNotes,

□ Tested settlement with test customer      waiveRemaining = false,

□ Verified no duplicate RTGS transaction      settledBy

□ Verified settlement history correct    } = body;

□ Verified waived amount cleared

    // Validation

PHASE 6: COMMIT (2 min)    if (!customerId) {

-----------------------      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });

□ Ran: git add app/api/customers/settlement/route.ts    }

□ Ran: git commit with message

□ Ran: git push    if (!settlementMode) {

□ Changes saved to repository      return NextResponse.json({ error: 'Settlement mode is required' }, { status: 400 });

    }

═══════════════════════════════════════════════════════════════

    const validModes = ['RTGS', 'CASH', 'CHEQUE', 'UPI', 'PARTIAL_WAIVER', 'FULL_WAIVER'];

WHAT WAS FIXED:    if (!validModes.includes(settlementMode)) {

---------------      return NextResponse.json({ error: 'Invalid settlement mode' }, { status: 400 });

✅ Duplicate RTGS transaction creation removed    }

✅ Settlement amount now recorded ONLY in settlement_amount field

✅ Settlements won't appear on current transactions page    // If full waiver, settlement amount should be 0

✅ Settlement history will show correct data    if (settlementMode === 'FULL_WAIVER' && settlementAmount > 0) {

✅ Waived amounts won't persist after settlement      return NextResponse.json({ error: 'Full waiver should have 0 settlement amount' }, { status: 400 });

    }

═══════════════════════════════════════════════════════════════

    // Call the settlement function

YOUR DATA SAFETY:    const { data, error } = await supabaseAdmin.rpc('settle_customer_account', {

-----------------      p_customer_id: customerId,

✅ No existing data modified      p_settlement_amount: settlementAmount || 0,

✅ Backups created before any changes      p_settlement_mode: settlementMode,

✅ Only code behavior changed      p_settlement_reference: settlementReference || null,

✅ Can be reverted easily if needed      p_settlement_notes: settlementNotes || null,

      p_waive_remaining: waiveRemaining || (settlementMode === 'FULL_WAIVER'),

═══════════════════════════════════════════════════════════════      p_settled_by: settledBy || 'system'

    });

Date Fixed: October 28, 2025

Fixed By: Bala    if (error) {

Total Time: ~20 minutes      console.error('Error settling customer account:', error);

Risk Level: LOW ✅      return NextResponse.json({ error: error.message }, { status: 500 });

    }

    // BUG FIX (2025-10-28): Removed duplicate transaction creation
    // Settlement amount is already recorded in customer_account_periods.settlement_amount
    // Creating a transaction here causes:
    // 1. Double-counting in total_received calculations
    // 2. Settlement transaction appearing on current page instead of being archived
    // 3. Incorrect settlement history data
    // The database function settle_customer_account() handles all financial recording correctly.
    
    // COMMENTED OUT TO FIX BUG:
    // if (settlementAmount > 0 && settlementMode !== 'PARTIAL_WAIVER') {
    //   // Get default bank account
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
