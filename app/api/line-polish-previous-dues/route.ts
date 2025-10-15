import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentMonth = searchParams.get('current_month');

    let query = supabaseAdmin
      .from('line_polish_previous_dues')
      .select('*')
      .order('created_at', { ascending: false });

    if (currentMonth) {
      query = query.eq('current_month', currentMonth);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching previous dues:', error);
      return NextResponse.json({ error: 'Failed to fetch previous dues' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET previous dues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('line_polish_previous_dues')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating previous due:', error);
      return NextResponse.json({ error: 'Failed to create previous due' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST previous due:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
