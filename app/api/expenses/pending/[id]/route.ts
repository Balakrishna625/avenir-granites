import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// PUT - Update a pending expense
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const { data, error } = await supabase
      .from('pending_expenses')
      .update({
        amount: body.amount,
        description: body.description,
        expense_date: body.expense_date,
        category_id: body.category_id,
        account_id: body.account_id,
        payment_method: body.payment_method,
        notes: body.notes
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating pending expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pending expense' },
      { status: 500 }
    );
  }
}

// DELETE - Reject a pending expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Update status to rejected instead of deleting
    const { error } = await supabase
      .from('pending_expenses')
      .update({
        status: 'rejected',
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error rejecting pending expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject pending expense' },
      { status: 500 }
    );
  }
}
