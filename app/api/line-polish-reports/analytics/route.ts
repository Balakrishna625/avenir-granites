import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");

  console.log('📊 Line Polish Analytics API called with:', { from, to, month, year });

  try {
    // Build date filter using Supabase query builder
    let query = supabaseAdmin.from("line_polish_reports").select("*");
    
    let startDate: string | null = null;
    let endDate: string | null = null;
    
    if (month && year) {
      // Filter by specific month and year
      startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      endDate = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    } else if (from || to) {
      startDate = from;
      endDate = to;
    }

    if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
      console.log('📅 Date range:', { startDate, endDate });
    } else if (startDate) {
      query = query.gte("date", startDate);
      console.log('📅 From date:', startDate);
    } else if (endDate) {
      query = query.lte("date", endDate);
      console.log('📅 To date:', endDate);
    }

    const { data: reports, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching reports:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Fetched', reports.length, 'reports');

    // Calculate analytics from fetched data
    // Handle both old format (number_of_slabs) and new format (total_slabs)
    const analytics = {
      summary: {
        total_entries: reports.length,
        total_days: new Set(reports.map(r => r.date)).size,
        total_workers: reports.reduce((sum, r) => sum + (r.no_of_workers || 0), 0),
        total_slabs: reports.reduce((sum, r) => sum + (r.total_slabs || r.number_of_slabs || 0), 0),
        total_sqft: reports.reduce((sum, r) => sum + (r.total_sqft || 0), 0),
        total_hours: reports.reduce((sum, r) => sum + (r.no_of_hours || 0), 0),
        total_debit: reports.reduce((sum, r) => sum + (r.debit_amount || 0), 0),
        total_credit: reports.reduce((sum, r) => sum + (r.credit_amount || 0), 0),
        balance: reports.reduce((sum, r) => sum + (r.debit_amount || 0) - (r.credit_amount || 0), 0),
        avg_rate_per_hour: reports.length > 0 ? 
          reports.reduce((sum, r) => sum + (r.rate_per_hour || 0), 0) / reports.length : 0
      },
      shift_breakdown: [],
      daily_trends: []
    };

    console.log('📊 Summary:', analytics.summary);

    console.log('📊 Summary:', analytics.summary);

    // Group by shift and activity for shift breakdown
    const shiftGroups = reports.reduce((acc, report) => {
      const key = `${report.shift}_${report.activity}`;
      if (!acc[key]) {
        acc[key] = {
          shift: report.shift,
          activity: report.activity,
          entries: 0,
          workers: 0,
          slabs: 0,
          sqft: 0,
          hours: 0,
          debit: 0,
          credit: 0,
          rates: []
        };
      }
      acc[key].entries++;
      acc[key].workers += report.no_of_workers || 0;
      acc[key].slabs += (report.total_slabs || report.number_of_slabs || 0);
      acc[key].sqft += report.total_sqft || 0;
      acc[key].hours += report.no_of_hours || 0;
      acc[key].debit += report.debit_amount || 0;
      acc[key].credit += report.credit_amount || 0;
      acc[key].rates.push(report.rate_per_hour || 0);
      return acc;
    }, {} as any);

    analytics.shift_breakdown = Object.values(shiftGroups).map((group: any) => ({
      shift: group.shift,
      activity: group.activity,
      entries: group.entries,
      workers: group.workers,
      slabs: group.slabs,
      sqft: group.sqft,
      hours: group.hours,
      debit: group.debit,
      credit: group.credit,
      avg_rate: group.rates.length > 0 ? 
        group.rates.reduce((sum: number, rate: number) => sum + rate, 0) / group.rates.length : 0
    }));

    console.log('🏭 Shift breakdown:', analytics.shift_breakdown.length, 'groups');

    // Group by date for daily trends
    const dateGroups = reports.reduce((acc, report) => {
      const date = report.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          workers: 0,
          slabs: 0,
          sqft: 0,
          hours: 0,
          debit: 0,
          credit: 0,
          remarks: [] // Collect all remarks for this date
        };
      }
      acc[date].workers += report.no_of_workers || 0;
      acc[date].slabs += (report.total_slabs || report.number_of_slabs || 0);
      acc[date].sqft += report.total_sqft || 0;
      acc[date].hours += report.no_of_hours || 0;
      acc[date].debit += report.debit_amount || 0;
      acc[date].credit += report.credit_amount || 0;
      // Collect remarks if they exist
      if (report.remarks && report.remarks.trim()) {
        acc[date].remarks.push(report.remarks.trim());
      }
      return acc;
    }, {} as any);

    analytics.daily_trends = Object.values(dateGroups)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    console.log('📈 Daily trends:', analytics.daily_trends.length, 'days');

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("❌ Error fetching line polish analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}