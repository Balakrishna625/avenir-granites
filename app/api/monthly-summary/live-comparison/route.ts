import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    // Exclude today — data is entered the next morning, so "current day" is yesterday.
    const today = now.getDate();
    const currentDay = today > 1 ? today - 1 : 1; // never go below day 1
    const currentMonth = now.getMonth(); // 0-indexed (2 = March)
    const currentYear = now.getFullYear();

    // This month: 1st to today
    const thisMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const thisMonthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

    // Last month: 1st to same day last month
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth() + 1; // 1-indexed
    // Cap at last day of previous month in case current day exceeds it
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const lastMonthDay = Math.min(currentDay, lastDayOfPrevMonth);
    const lastMonthStart = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
    const lastMonthEnd = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(lastMonthDay).padStart(2, '0')}`;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const thisMonthName = monthNames[currentMonth];
    const lastMonthName = monthNames[lastMonthDate.getMonth()];

    // Fetch production data for both periods in parallel
    const [
      { data: thisMonthProduction, error: e1 },
      { data: lastMonthProduction, error: e2 },
      { data: thisMonthSales, error: e3 },
      { data: lastMonthSales, error: e4 },
    ] = await Promise.all([
      supabaseAdmin
        .from('multi_cutter_reports')
        .select('date, total_slabs, total_sqft')
        .gte('date', thisMonthStart)
        .lte('date', thisMonthEnd),
      supabaseAdmin
        .from('multi_cutter_reports')
        .select('date, total_slabs, total_sqft')
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd),
      supabaseAdmin
        .from('sales')
        .select('sale_date, total_sqft, gross_total')
        .gte('sale_date', thisMonthStart)
        .lte('sale_date', thisMonthEnd),
      supabaseAdmin
        .from('sales')
        .select('sale_date, total_sqft, gross_total')
        .gte('sale_date', lastMonthStart)
        .lte('sale_date', lastMonthEnd),
    ]);

    if (e1 || e2 || e3 || e4) {
      console.error('Error fetching comparison data:', e1 || e2 || e3 || e4);
      return NextResponse.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
    }

    // Aggregate production
    const thisProductionSqft = (thisMonthProduction || []).reduce((s, r) => s + (Number(r.total_sqft) || 0), 0);
    const thisProductionSlabs = (thisMonthProduction || []).reduce((s, r) => s + (Number(r.total_slabs) || 0), 0);
    const lastProductionSqft = (lastMonthProduction || []).reduce((s, r) => s + (Number(r.total_sqft) || 0), 0);
    const lastProductionSlabs = (lastMonthProduction || []).reduce((s, r) => s + (Number(r.total_slabs) || 0), 0);

    // Aggregate sales
    const thisSalesSqft = (thisMonthSales || []).reduce((s, r) => s + (Number(r.total_sqft) || 0), 0);
    const thisSalesRevenue = (thisMonthSales || []).reduce((s, r) => s + (Number(r.gross_total) || 0), 0);
    const lastSalesSqft = (lastMonthSales || []).reduce((s, r) => s + (Number(r.total_sqft) || 0), 0);
    const lastSalesRevenue = (lastMonthSales || []).reduce((s, r) => s + (Number(r.gross_total) || 0), 0);

    // Calculate percentage changes
    const pctChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // Build daily breakdown for chart
    const dailyProduction: { day: number; thisMonth: number; lastMonth: number }[] = [];
    const dailySales: { day: number; thisMonth: number; lastMonth: number }[] = [];

    for (let d = 1; d <= currentDay; d++) {
      const dayStr = String(d).padStart(2, '0');

      // Production per day
      const thisDayProd = (thisMonthProduction || [])
        .filter(r => new Date(r.date).getDate() === d)
        .reduce((s, r) => s + (Number(r.total_sqft) || 0), 0);
      const lastDayProd = d <= lastMonthDay
        ? (lastMonthProduction || [])
            .filter(r => new Date(r.date).getDate() === d)
            .reduce((s, r) => s + (Number(r.total_sqft) || 0), 0)
        : 0;

      dailyProduction.push({
        day: d,
        thisMonth: Number(thisDayProd.toFixed(2)),
        lastMonth: Number(lastDayProd.toFixed(2)),
      });

      // Sales per day
      const thisDaySales = (thisMonthSales || [])
        .filter(r => new Date(r.sale_date).getDate() === d)
        .reduce((s, r) => s + (Number(r.gross_total) || 0), 0);
      const lastDaySales = d <= lastMonthDay
        ? (lastMonthSales || [])
            .filter(r => new Date(r.sale_date).getDate() === d)
            .reduce((s, r) => s + (Number(r.gross_total) || 0), 0)
        : 0;

      dailySales.push({
        day: d,
        thisMonth: Number(thisDaySales.toFixed(2)),
        lastMonth: Number(lastDaySales.toFixed(2)),
      });
    }

    return NextResponse.json({
      currentDay,
      thisMonthName,
      lastMonthName,
      lastMonthDay,
      production: {
        thisMonth: { sqft: Number(thisProductionSqft.toFixed(2)), slabs: thisProductionSlabs },
        lastMonth: { sqft: Number(lastProductionSqft.toFixed(2)), slabs: lastProductionSlabs },
        sqftChange: pctChange(thisProductionSqft, lastProductionSqft),
        slabsChange: pctChange(thisProductionSlabs, lastProductionSlabs),
        daily: dailyProduction,
      },
      sales: {
        thisMonth: { sqft: Number(thisSalesSqft.toFixed(2)), revenue: Number(thisSalesRevenue.toFixed(2)) },
        lastMonth: { sqft: Number(lastSalesSqft.toFixed(2)), revenue: Number(lastSalesRevenue.toFixed(2)) },
        sqftChange: pctChange(thisSalesSqft, lastSalesSqft),
        revenueChange: pctChange(thisSalesRevenue, lastSalesRevenue),
        daily: dailySales,
      },
    });
  } catch (error: any) {
    console.error('Error in live comparison API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
