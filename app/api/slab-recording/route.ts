import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { part_id, slab_count, sqft_produced } = body;

    // First, get the part details to calculate the unit values
    const { data: part, error: partError } = await supabase
      .from('granite_block_parts')
      .select(`
        id,
        block_id,
        part_name,
        gross_measurement,
        net_measurement,
        granite_blocks!inner(
          id,
          consignment_id
        )
      `)
      .eq('id', part_id)
      .single();

    if (partError || !part) {
      console.error('Error fetching part:', partError);
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }

    // Update the part with the slab production data
    const { data: updatedPart, error: updateError } = await supabase
      .from('granite_block_parts')
      .update({
        slabs_produced: slab_count,
        sqft_produced: sqft_produced,
        status: 'PROCESSED'
      })
      .eq('id', part_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating part:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update the block totals
    const { data: blockParts, error: blockPartsError } = await supabase
      .from('granite_block_parts')
      .select('slabs_produced, sqft_produced')
      .eq('block_id', part.block_id);

    if (!blockPartsError && blockParts) {
      const totalSlabs = blockParts.reduce((sum, p) => sum + (p.slabs_produced || 0), 0);
      const totalSqft = blockParts.reduce((sum, p) => sum + (p.sqft_produced || 0), 0);

      await supabase
        .from('granite_blocks')
        .update({
          total_slabs: totalSlabs,
          total_sqft: totalSqft,
          status: 'PROCESSED'
        })
        .eq('id', part.block_id);
    }

    // Update the consignment totals
    const consignmentId = (part.granite_blocks as any)?.consignment_id;
    
    if (consignmentId) {
      const { data: consignmentBlocks, error: consignmentBlocksError } = await supabase
        .from('granite_blocks')
        .select('total_sqft')
        .eq('consignment_id', consignmentId);

      if (!consignmentBlocksError && consignmentBlocks) {
        const consignmentTotalSqft = consignmentBlocks.reduce((sum, b) => sum + (b.total_sqft || 0), 0);

        await supabase
          .from('granite_consignments')
          .update({
            total_sqft_produced: consignmentTotalSqft
          })
          .eq('id', consignmentId);
      }
    }

    return NextResponse.json(updatedPart, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}