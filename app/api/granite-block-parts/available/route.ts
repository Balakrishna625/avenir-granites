import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json([]);
    }
    const { data: parts, error } = await supabase
      .from('granite_block_parts')
      .select(`
        id,
        block_id,
        part_name,
        slabs_count,
        sqft,
        thickness,
        is_available,
        sold_sqft,
        remaining_sqft,
        granite_blocks!inner(
          block_no,
          consignment_id,
          granite_consignments!inner(
            consignment_number,
            granite_suppliers!inner(
              name
            )
          )
        )
      `)
      .eq('is_available', true)
      .gt('remaining_sqft', 0)
      .order('created_at', { ascending: false })
      .then(result => {
        if (result.error && result.error.message.includes('does not exist')) {
          return { data: [], error: null };
        }
        return result;
      });

    if (error) {
      console.error('Error fetching available parts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to flatten the nested structure
    const transformedParts = parts?.map((part: any) => ({
      id: part.id,
      block_id: part.block_id,
      part_name: part.part_name,
      slabs_count: part.slabs_count,
      sqft: part.sqft,
      thickness: part.thickness,
      is_available: part.is_available,
      sold_sqft: part.sold_sqft,
      remaining_sqft: part.remaining_sqft,
      block_no: part.granite_blocks?.block_no || '',
      consignment_number: part.granite_blocks?.granite_consignments?.consignment_number || '',
      supplier_name: part.granite_blocks?.granite_consignments?.granite_suppliers?.name || '',
      cost_per_sqft: 70 // Default cost per sqft when column doesn't exist
    })) || [];

    return NextResponse.json(transformedParts);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}