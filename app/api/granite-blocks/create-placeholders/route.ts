import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/granite-blocks/create-placeholders
 * 
 * Creates N placeholder blocks for a consignment
 * Useful when you know how many blocks are coming but don't have details yet
 * 
 * Request body:
 * {
 *   consignment_id: string (UUID)
 *   number_of_blocks: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consignment_id, number_of_blocks } = body;

    if (!consignment_id || !number_of_blocks || number_of_blocks < 1) {
      return NextResponse.json(
        { error: "consignment_id and number_of_blocks (>= 1) are required" },
        { status: 400 }
      );
    }

    // Generate placeholder blocks
    const placeholderBlocks = Array.from({ length: number_of_blocks }, (_, index) => ({
      consignment_id,
      block_no: null, // Will be filled when block arrives
      gross_measurement: null, // Will be filled when block arrives
      net_measurement: 0,
      grade: 'S/G',
      status: 'RAW', // Processing status
      arrival_status: 'pending', // Awaiting arrival
      total_sqft: 0,
      total_slabs: 0,
      raw_material_rate_per_sqft: 0,
      production_cost_per_sqft: 40,
      total_cost_per_sqft: 0,
      total_sqft_produced: 0
    }));

    console.log(`Creating ${number_of_blocks} placeholder blocks for consignment ${consignment_id}`);

    const { data, error } = await supabaseAdmin
      .from("granite_blocks")
      .insert(placeholderBlocks)
      .select('id, consignment_id, block_no, gross_measurement, net_measurement, status, arrival_status, created_at');

    if (error) {
      console.error('Error creating placeholder blocks:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log(`Successfully created ${data.length} placeholder blocks`);
    return NextResponse.json({ 
      success: true, 
      blocks: data,
      count: data.length 
    }, { status: 201 });

  } catch (error) {
    console.error('Server error creating placeholder blocks:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
