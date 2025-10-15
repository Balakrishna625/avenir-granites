import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");

  try {
    // Build date filter based on parameters
    let dateFilter = "";
    const params: any[] = [];
    
    if (month && year) {
      // Filter by specific month and year
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      dateFilter = "date >= $1 AND date <= $2";
      params.push(startDate, endDate);
    } else if (from && to) {
      // Filter by date range
      dateFilter = "date >= $1 AND date <= $2";
      params.push(from, to);
    } else if (from) {
      dateFilter = "date >= $1";
      params.push(from);
    } else if (to) {
      dateFilter = "date <= $1";
      params.push(to);
    }

    // Get summary statistics
    let summaryQuery = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT date) as total_days,
        SUM(no_of_workers) as total_workers,
        SUM(number_of_slabs) as total_slabs,
        SUM(total_sqft) as total_sqft,
        SUM(no_of_hours) as total_hours,
        SUM(debit_amount) as total_debit,
        SUM(credit_amount) as total_credit,
        (SUM(debit_amount) - SUM(credit_amount)) as balance,
        AVG(rate_per_hour) as avg_rate_per_hour
      FROM line_polish_reports
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
    `;

    const { data: summary, error: summaryError } = await supabaseAdmin.rpc('execute_sql', {
      query: summaryQuery,
      params
    });

    // Get shift-wise breakdown
    let shiftQuery = `
      SELECT 
        shift,
        activity,
        COUNT(*) as entries,
        SUM(no_of_workers) as workers,
        SUM(number_of_slabs) as slabs,
        SUM(total_sqft) as sqft,
        SUM(no_of_hours) as hours,
        SUM(debit_amount) as debit,
        SUM(credit_amount) as credit,
        AVG(rate_per_hour) as avg_rate
      FROM line_polish_reports
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      GROUP BY shift, activity
      ORDER BY shift, activity
    `;

    const { data: shiftBreakdown, error: shiftError } = await supabaseAdmin.rpc('execute_sql', {
      query: shiftQuery,
      params
    });

    // Get daily trends (last 30 days or filtered period)
    let dailyQuery = `
      SELECT 
        date,
        SUM(no_of_workers) as workers,
        SUM(number_of_slabs) as slabs,
        SUM(total_sqft) as sqft,
        SUM(no_of_hours) as hours,
        SUM(debit_amount) as debit,
        SUM(credit_amount) as credit
      FROM line_polish_reports
      ${dateFilter ? `WHERE ${dateFilter}` : 'WHERE date >= CURRENT_DATE - INTERVAL \'30 days\''}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `;

    const { data: dailyTrends, error: dailyError } = await supabaseAdmin.rpc('execute_sql', {
      query: dailyQuery,
      params: dateFilter ? params : []
    });

    // Alternative approach using regular Supabase queries if RPC doesn't work
    if (summaryError || shiftError || dailyError) {
      // Fallback to regular queries
      let query = supabaseAdmin.from("line_polish_reports").select("*");
      
      if (dateFilter && params.length > 0) {
        if (params.length === 2) {
          query = query.gte("date", params[0]).lte("date", params[1]);
        } else {
          query = query.gte("date", params[0]);
        }
      }

      const { data: reports, error } = await query;
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Calculate analytics manually
      const analytics = {
        summary: {
          total_entries: reports.length,
          total_days: new Set(reports.map(r => r.date)).size,
          total_workers: reports.reduce((sum, r) => sum + (r.no_of_workers || 0), 0),
          total_slabs: reports.reduce((sum, r) => sum + (r.number_of_slabs || 0), 0),
          total_sqft: reports.reduce((sum, r) => sum + (r.total_sqft || 0), 0),
          total_hours: reports.reduce((sum, r) => sum + (r.no_of_hours || 0), 0),
          total_debit: reports.reduce((sum, r) => sum + (r.debit_amount || 0), 0),
          total_credit: reports.reduce((sum, r) => sum + (r.credit_amount || 0), 0),
          balance: reports.reduce((sum, r) => sum + (r.debit_amount || 0) - (r.credit_amount || 0), 0),
          avg_rate_per_hour: reports.length > 0 ? 
            reports.reduce((sum, r) => sum + (r.rate_per_hour || 0), 0) / reports.length : 0
        },
        shift_breakdown: {},
        daily_trends: []
      };

      // Group by shift and activity
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
        acc[key].slabs += report.number_of_slabs || 0;
        acc[key].sqft += report.total_sqft || 0;
        acc[key].hours += report.no_of_hours || 0;
        acc[key].debit += report.debit_amount || 0;
        acc[key].credit += report.credit_amount || 0;
        acc[key].rates.push(report.rate_per_hour || 0);
        return acc;
      }, {} as any);

      analytics.shift_breakdown = Object.values(shiftGroups).map((group: any) => ({
        ...group,
        avg_rate: group.rates.length > 0 ? 
          group.rates.reduce((sum: number, rate: number) => sum + rate, 0) / group.rates.length : 0
      }));

      // Group by date for trends
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
            credit: 0
          };
        }
        acc[date].workers += report.no_of_workers || 0;
        acc[date].slabs += report.number_of_slabs || 0;
        acc[date].sqft += report.total_sqft || 0;
        acc[date].hours += report.no_of_hours || 0;
        acc[date].debit += report.debit_amount || 0;
        acc[date].credit += report.credit_amount || 0;
        return acc;
      }, {} as any);

      analytics.daily_trends = Object.values(dateGroups)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30);

      return NextResponse.json(analytics);
    }

    return NextResponse.json({
      summary: summary?.[0] || {},
      shift_breakdown: shiftBreakdown || [],
      daily_trends: dailyTrends || []
    });
  } catch (error) {
    console.error("Error fetching line polish analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}