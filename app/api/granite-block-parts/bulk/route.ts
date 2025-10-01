import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

/*
Expected payload:
[
  {
    block_id: string,
    parts: [
      { part_name: 'A' | 'B' | 'C' | 'C+D', slabs_count: number, sqft: number, thickness?: number }
    ]
  }, ...
]
*/
export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const payload = await req.json();
    if (!Array.isArray(payload)) {
      return NextResponse.json({ error: 'Array payload required' }, { status: 400 });
    }

    const upserts: any[] = [];

    for (const blockEntry of payload) {
      const { block_id, parts } = blockEntry;
      if (!block_id || !Array.isArray(parts)) continue;

      for (const p of parts) {
        if (!p.part_name) continue;
        upserts.push({
          block_id,
          part_name: p.part_name,
          slabs_count: p.slabs_count || 0,
            sqft: p.sqft || 0,
            thickness: p.thickness || 20,
            is_available: true
        });
      }
    }

    if (upserts.length === 0) {
      return NextResponse.json({ message: 'Nothing to save' });
    }

    // Approach: delete existing parts for included blocks and reinsert (simpler idempotent behavior)
    const uniqueBlockIds = [...new Set(upserts.map(u => u.block_id))];
    const { error: delError } = await supabase
      .from('granite_block_parts')
      .delete()
      .in('block_id', uniqueBlockIds);
    if (delError) {
      console.error('Delete error', delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('granite_block_parts')
      .insert(upserts)
      .select();
    if (insertError) {
      console.error('Insert error', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ saved: inserted.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}