import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reports } = body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json({ error: 'Reports array is required' }, { status: 400 });
    }

    // Validate each report
    const validatedReports = reports.map((report: any) => {
      if (!report.date || !report.shift || !report.activity) {
        throw new Error('Missing required fields: date, shift, or activity');
      }

      return {
        date: report.date,
        shift: report.shift,
        activity: report.activity,
        no_of_workers: parseInt(report.no_of_workers) || 0,
        number_of_slabs: parseInt(report.number_of_slabs) || 0,
        total_sqft: parseFloat(report.total_sqft) || 0,
        no_of_hours: parseFloat(report.no_of_hours) || 0,
        rate_per_hour: parseFloat(report.rate_per_hour) || 0,
        debit_amount: parseFloat(report.debit_amount) || 0,
        remarks: report.remarks || null,
      };
    });

    // Insert all reports in bulk
    const { data, error } = await supabase
      .from('line_polish_reports')
      .insert(validatedReports)
      .select();

    if (error) {
      console.error('Error inserting reports:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique months from imported reports
    const months = new Set<string>();
    validatedReports.forEach(report => {
      const month = report.date.slice(0, 7);
      months.add(month);
    });

    // Update monthly balances for all affected months
    for (const month of months) {
      try {
        await fetch(`${request.nextUrl.origin}/api/line-polish-monthly-balances`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month }),
        });
      } catch (err) {
        console.error(`Error updating balance for ${month}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      imported: data.length,
      data,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
