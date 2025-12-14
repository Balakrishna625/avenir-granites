import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// POST - Approve pending expense and create actual expense
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the pending expense
    const { data: pendingExpense, error: fetchError } = await supabase
      .from('pending_expenses')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single();

    if (fetchError) throw fetchError;
    if (!pendingExpense) {
      return NextResponse.json(
        { error: 'Pending expense not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!pendingExpense.account_id) {
      return NextResponse.json(
        { error: 'Bank account is required' },
        { status: 400 }
      );
    }

    if (!pendingExpense.category_id) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Create the actual expense
    const { data: expense, error: createError } = await supabase
      .from('expenses')
      .insert([{
        date: pendingExpense.expense_date,
        category_id: pendingExpense.category_id,
        amount: pendingExpense.amount,
        tax_amount: 0,
        total_amount: pendingExpense.amount,
        account_id: pendingExpense.account_id,
        description: pendingExpense.description,
        payment_method: pendingExpense.payment_method,
        payment_status: 'PAID',
        notes: pendingExpense.notes
      }])
      .select()
      .single();

    if (createError) throw createError;

    // Update pending expense status to approved
    const { error: updateError } = await supabase
      .from('pending_expenses')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_expense_id: expense.id
      })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      expense: expense
    });
  } catch (error: any) {
    console.error('Error approving pending expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve pending expense' },
      { status: 500 }
    );
  }
}
