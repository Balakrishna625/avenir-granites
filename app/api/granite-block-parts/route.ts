import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json([]);
    }
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('block_id');

    if (!blockId) {
      return NextResponse.json({ error: 'block_id is required' }, { status: 400 });
    }

    const { data: parts, error } = await supabase
      .from('granite_block_parts')
      .select('*')
      .eq('block_id', blockId)
      .order('part_name');

    if (error) {
      console.error('Error fetching block parts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(parts || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('granite_block_parts')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Error creating block part:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}