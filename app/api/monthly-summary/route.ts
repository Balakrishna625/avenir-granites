import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromMonth = searchParams.get('fromMonth');
    const fromYear = searchParams.get('fromYear');
    const toMonth = searchParams.get('toMonth');
    const toYear = searchParams.get('toYear');

    // Default to current financial year if not specified
    let startDate: string;
    let endDate: string;

    if (fromMonth && fromYear && toMonth && toYear) {
      startDate = `${fromYear}-${fromMonth.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(toYear), parseInt(toMonth), 0).getDate();
      endDate = `${toYear}-${toMonth.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    } else {
      // Default to current financial year
      const fy = getCurrentFinancialYear();
      const [startYear, endYear] = fy.split('-').map(y => parseInt(y));
      startDate = `${startYear}-04-01`;
      endDate = `${endYear}-03-31`;
    }

    console.log('📊 Fetching monthly summary:', { startDate, endDate });

    // Fetch Multi Cutter Production Data (correct column names: total_slabs, total_sqft)
    const { data: multiCutterData, error: mcError } = await supabaseAdmin
      .from('multi_cutter_reports')
      .select('date, total_slabs, total_sqft')
      .gte('date', startDate)
      .lte('date', endDate);

    if (mcError) {
      console.error('Error fetching multi cutter data:', mcError);
      return NextResponse.json({ error: mcError.message }, { status: 500 });
    }

    // Fetch Sales Data
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('sale_date, total_sqft, gross_total')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    if (salesError) {
      console.error('Error fetching sales data:', salesError);
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    // Fetch Line Polish Worker Hours Data
    const { data: linePolishData, error: lpError } = await supabaseAdmin
      .from('line_polish_reports')
      .select('date, no_of_hours')
      .gte('date', startDate)
      .lte('date', endDate);

    if (lpError) {
      console.error('Error fetching line polish data:', lpError);
      return NextResponse.json({ error: lpError.message }, { status: 500 });
    }

    // Process and aggregate data by month
    const monthlyData = aggregateMonthlyData(
      multiCutterData || [],
      salesData || [],
      linePolishData || [],
      startDate,
      endDate
    );

    console.log('✅ Monthly summary calculated:', monthlyData.length, 'months');
    console.log('📊 Sample data:', multiCutterData?.slice(0, 2), salesData?.slice(0, 2), linePolishData?.slice(0, 2));

    return NextResponse.json({
      dateRange: { startDate, endDate },
      monthlyData,
      summary: calculateSummary(monthlyData)
    });

  } catch (error: any) {
    console.error('Error in monthly summary API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to get current financial year
function getCurrentFinancialYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  if (currentMonth >= 4) {
    // April to December: FY is current year to next year
    return `${currentYear}-${currentYear + 1}`;
  } else {
    // January to March: FY is previous year to current year
    return `${currentYear - 1}-${currentYear}`;
  }
}

// Helper function to aggregate data by month
function aggregateMonthlyData(
  multiCutterData: any[],
  salesData: any[],
  linePolishData: any[],
  startDate: string,
  endDate: string
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Generate list of months between start and end
  const months = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    months.push({
      name: current.toLocaleDateString('en-US', { month: 'short' }),
      month: current.getMonth() + 1,
      year: current.getFullYear()
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months.map(({ name, month, year }) => {
    // Multi Cutter Production for this month (correct column names)
    const mcFiltered = multiCutterData.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });
    const multiCutterProduction = mcFiltered.reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);
    const multiCutterSlabs = mcFiltered.reduce((sum, r) => sum + (Number(r.total_slabs) || 0), 0);

    // Sales for this month
    const salesFiltered = salesData.filter(record => {
      const date = new Date(record.sale_date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });
    const salesSqft = salesFiltered.reduce((sum, r) => sum + (Number(r.total_sqft) || 0), 0);
    const salesRevenue = salesFiltered.reduce((sum, r) => sum + (Number(r.gross_total) || 0), 0);

    // Line Polish Worker Hours for this month
    const lpFiltered = linePolishData.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });
    const workerHours = lpFiltered.reduce((sum, r) => sum + (Number(r.no_of_hours) || 0), 0);

    // Round sqft and revenue to whole numbers (standard rounding: >=0.5 rounds up).
    // workerHours kept to 1 decimal — half-hour precision is meaningful for labour records.
    // No cross-field addition here, so rounding each independently causes no mismatch.
    return {
      month: name,
      fullMonth: `${name} ${year}`,
      multiCutterProduction: Math.round(multiCutterProduction),
      multiCutterSlabs,
      salesSqft: Math.round(salesSqft),
      salesRevenue: Math.round(salesRevenue),
      workerHours: Math.round(workerHours * 10) / 10   // 1 decimal place
    };
  });
}

// Calculate overall summary
// NOTE: Totals are re-summed from already-rounded monthly values.
// Averages are derived from raw (pre-round) re-sums to avoid compounded rounding drift,
// then rounded themselves — so avg * months may differ from total by up to (months/2) sqft, which is expected.
function calculateSummary(monthlyData: any[]) {
  const monthCount = monthlyData.length || 1;

  const totalProduction = monthlyData.reduce((sum, m) => sum + m.multiCutterProduction, 0);
  const totalSalesSqft  = monthlyData.reduce((sum, m) => sum + m.salesSqft, 0);
  const totalRevenue    = monthlyData.reduce((sum, m) => sum + m.salesRevenue, 0);
  const totalHours      = monthlyData.reduce((sum, m) => sum + m.workerHours, 0);

  return {
    totalMultiCutterProduction: Math.round(totalProduction),
    totalMultiCutterSlabs: monthlyData.reduce((sum, m) => sum + m.multiCutterSlabs, 0),
    totalSalesSqft:    Math.round(totalSalesSqft),
    totalSalesRevenue: Math.round(totalRevenue),
    totalWorkerHours:  Math.round(totalHours * 10) / 10,
    avgMonthlyProduction: Math.round(totalProduction / monthCount),
    avgMonthlySales:      Math.round(totalSalesSqft  / monthCount),
    avgMonthlyRevenue:    Math.round(totalRevenue     / monthCount),
    avgMonthlyHours:      Math.round((totalHours / monthCount) * 10) / 10
  };
}
