import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// POST: record or update production for a block part
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { block_id, part_name, slabs_count, sqft, thickness } = body;

    if (!block_id || !part_name) {
      return NextResponse.json({ error: 'block_id and part_name required' }, { status: 400 });
    }

    // Try to find existing part
    const { data: existing, error: fetchError } = await supabase
      .from('granite_block_parts')
      .select('*')
      .eq('block_id', block_id)
      .eq('part_name', part_name)
      .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('granite_block_parts')
        .update({ slabs_count, sqft, thickness })
        .eq('id', existing.id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: existing.id, updated: true });
    } else {
      // Insert new
      const { data: inserted, error: insertError } = await supabase
        .from('granite_block_parts')
        .insert({ block_id, part_name, slabs_count, sqft, thickness, is_available: true })
        .select()
        .single();
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: inserted.id, created: true });
    }
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}