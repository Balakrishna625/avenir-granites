import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // Calculate debit amount
    const debit_amount = (body.no_of_hours || 0) * (body.rate_per_hour || 0);
    
    const updateData = {
      ...body,
      debit_amount,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('line_polish_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating line polish report:', error);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT line polish report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const { error } = await supabaseAdmin
      .from('line_polish_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting line polish report:', error);
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE line polish report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}