import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('line_polish_previous_dues')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting previous due:', error);
      return NextResponse.json({ error: 'Failed to delete previous due' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE previous due:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
