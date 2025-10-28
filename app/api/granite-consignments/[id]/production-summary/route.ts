import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch consignment production summary from our view
    const { data: productionData, error: productionError } = await supabaseAdmin
      .from('consignment_production_summary')
      .select('*')
      .eq('consignment_id', id)
      .single();

    if (productionError && productionError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching production summary:', productionError);
      return NextResponse.json(
        { error: 'Failed to fetch production summary' },
        { status: 500 }
      );
    }

    // If no production data found, fetch consignment with blocks but no production
    if (!productionData) {
      const { data: consignment, error: consignmentError } = await supabaseAdmin
        .from('granite_consignments')
        .select(`
          id,
          consignment_number,
          supplier_id,
          arrival_date,
          total_blocks,
          granite_blocks (
            id,
            block_no,
            gross_measurement,
            net_measurement,
            status,
            grade
          )
        `)
        .eq('id', id)
        .single();

      if (consignmentError) {
        console.error('Error fetching consignment:', consignmentError);
        return NextResponse.json(
          { error: 'Failed to fetch consignment' },
          { status: 500 }
        );
      }

      // Return consignment with no production data
      return NextResponse.json({
        consignment_id: consignment.id,
        consignment_number: consignment.consignment_number,
        supplier_id: consignment.supplier_id,
        arrival_date: consignment.arrival_date,
        total_blocks: consignment.total_blocks,
        blocks_with_production: 0,
        consignment_multi_cutter_sqft: 0,
        consignment_multi_cutter_slabs: 0,
        consignment_line_polish_sqft: 0,
        consignment_line_polish_slabs: 0,
        consignment_expected_sqft: consignment.granite_blocks.reduce(
          (sum: number, block: any) => sum + (block.gross_measurement * 300),
          0
        ),
        consignment_sqft_variance: 0,
        avg_production_efficiency: 0,
        blocks_details: consignment.granite_blocks.map((block: any) => ({
          block_no: block.block_no,
          block_id: block.id,
          multi_cutter_sqft: 0,
          multi_cutter_slabs: 0,
          line_polish_sqft: 0,
          line_polish_slabs: 0,
          number_of_parts: 0,
          parts_list: [],
          parts_details: [],
          expected_sqft: block.gross_measurement * 300,
          efficiency_percentage: 0
        }))
      });
    }

    return NextResponse.json(productionData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
