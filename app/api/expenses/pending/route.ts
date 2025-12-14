import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all pending expenses
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('pending_expenses')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching pending expenses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending expenses' },
      { status: 500 }
    );
  }
}

// POST - Create a new pending expense (from WhatsApp parser)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('pending_expenses')
      .insert([{
        message_text: body.message_text,
        image_url: body.image_url || null,
        amount: body.amount,
        description: body.description,
        expense_date: body.expense_date || new Date().toISOString().split('T')[0],
        category_id: body.category_id || null,
        account_id: body.account_id || null,
        payment_method: body.payment_method || 'CASH',
        notes: body.notes || null,
        ocr_amount: body.ocr_amount || null,
        ocr_vendor: body.ocr_vendor || null,
        ocr_date: body.ocr_date || null,
        ocr_raw_text: body.ocr_raw_text || null,
        parsed_text_amount: body.parsed_text_amount || null,
        confidence_score: body.confidence_score || null,
        has_conflict: body.has_conflict || false,
        conflict_details: body.conflict_details || null,
        created_by: body.created_by || null
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pending expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pending expense' },
      { status: 500 }
    );
  }
}
