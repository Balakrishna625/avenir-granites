import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch consignment statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build date filter
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (month && year) {
      startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
    }

    // Fetch consignments for the period
    let query = supabase
      .from('granite_consignments')
      .select('*');

    if (startDate && endDate) {
      query = query.gte('purchase_date', startDate).lte('purchase_date', endDate);
    }

    const { data: consignments, error: consignmentsError } = await query;

    if (consignmentsError) {
      console.error('Error fetching consignments:', consignmentsError);
      return NextResponse.json({ error: consignmentsError.message }, { status: 500 });
    }

    // Calculate statistics
    const totalConsignments = consignments?.length || 0;
    const totalMoneySpent = consignments?.reduce((sum, c) => sum + (c.total_expenditure || 0), 0) || 0;
    const totalBlocks = consignments?.reduce((sum, c) => sum + (c.total_blocks_count || 0), 0) || 0;
    const totalNetMeasurement = consignments?.reduce((sum, c) => sum + (c.total_net_measurement || 0), 0) || 0;
    const totalGrossMeasurement = consignments?.reduce((sum, c) => sum + (c.total_gross_measurement || 0), 0) || 0;

    // Breakdown by quarry
    const quarryBreakdown = consignments?.reduce((acc: any, c) => {
      const quarry = c.quarry_name || 'Unknown';
      if (!acc[quarry]) {
        acc[quarry] = {
          count: 0,
          totalSpent: 0,
          totalBlocks: 0,
          netMeasurement: 0,
          grossMeasurement: 0
        };
      }
      acc[quarry].count++;
      acc[quarry].totalSpent += c.total_expenditure || 0;
      acc[quarry].totalBlocks += c.total_blocks_count || 0;
      acc[quarry].netMeasurement += c.total_net_measurement || 0;
      acc[quarry].grossMeasurement += c.total_gross_measurement || 0;
      return acc;
    }, {});

    return NextResponse.json({
      totalConsignments,
      totalMoneySpent,
      totalBlocks,
      totalNetMeasurement,
      totalGrossMeasurement,
      quarryBreakdown: Object.entries(quarryBreakdown || {}).map(([name, data]) => ({
        quarry: name,
        ...(data as any)
      }))
    });
  } catch (error) {
    console.error('Error in GET /api/consignments-new/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
