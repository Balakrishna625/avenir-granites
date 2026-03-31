import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface DowntimeEntry {
  date: string;
  type: 'multi-cutter' | 'line-polish-full' | 'line-polish-half';
  details?: string; // e.g., "Morning shift only" or "Night shift only"
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromMonth = searchParams.get('fromMonth');
    const fromYear = searchParams.get('fromYear');
    const toMonth = searchParams.get('toMonth');
    const toYear = searchParams.get('toYear');

    let startDate: string;
    let endDate: string;

    if (fromMonth && fromYear && toMonth && toYear) {
      startDate = `${fromYear}-${fromMonth.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(toYear), parseInt(toMonth), 0).getDate();
      endDate = `${toYear}-${toMonth.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    } else {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      startDate = `${fyStartYear}-04-01`;
      endDate = `${fyStartYear + 1}-03-31`;
    }

    console.log('[Downtime API] Date range:', { startDate, endDate });

    // Fetch multi-cutter reports
    const { data: multiCutterData, error: mcError } = await supabaseAdmin
      .from('multi_cutter_reports')
      .select('date, total_sqft, machine')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (mcError) {
      console.error('[Downtime API] Multi-cutter error:', mcError);
      return NextResponse.json({ error: mcError.message }, { status: 500 });
    }

    // Fetch line-polish reports
    const { data: linePolishData, error: lpError } = await supabaseAdmin
      .from('line_polish_reports')
      .select('date, shift, no_of_hours')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (lpError) {
      console.error('[Downtime API] Line-polish error:', lpError);
      return NextResponse.json({ error: lpError.message }, { status: 500 });
    }

    // Process multi-cutter downtime (days with 0 production across all machines)
    const multiCutterByDate: Record<string, number> = {};
    (multiCutterData || []).forEach(record => {
      const date = record.date;
      multiCutterByDate[date] = (multiCutterByDate[date] || 0) + (Number(record.total_sqft) || 0);
    });

    const multiCutterDowntime: DowntimeEntry[] = [];
    // Generate all dates in range and check for 0 production
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const totalSqft = multiCutterByDate[dateStr] || 0;
      if (totalSqft === 0) {
        multiCutterDowntime.push({
          date: dateStr,
          type: 'multi-cutter'
        });
      }
    }

    // Process line-polish downtime
    const linePolishByDate: Record<string, { morningHours: number; nightHours: number }> = {};
    (linePolishData || []).forEach(record => {
      const date = record.date;
      const hours = Number(record.no_of_hours) || 0;
      if (!linePolishByDate[date]) {
        linePolishByDate[date] = { morningHours: 0, nightHours: 0 };
      }
      if (record.shift === 'MORNING') {
        linePolishByDate[date].morningHours += hours;
      } else if (record.shift === 'NIGHT') {
        linePolishByDate[date].nightHours += hours;
      }
    });

    const linePolishFullDowntime: DowntimeEntry[] = [];
    const linePolishHalfDowntime: DowntimeEntry[] = [];

    // Check each date in range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const shifts = linePolishByDate[dateStr] || { morningHours: 0, nightHours: 0 };
      
      if (shifts.morningHours === 0 && shifts.nightHours === 0) {
        // Full day downtime
        linePolishFullDowntime.push({
          date: dateStr,
          type: 'line-polish-full',
          details: 'Both shifts down'
        });
      } else if (shifts.morningHours === 0 && shifts.nightHours > 0) {
        // Morning shift down only
        linePolishHalfDowntime.push({
          date: dateStr,
          type: 'line-polish-half',
          details: 'Morning shift down'
        });
      } else if (shifts.nightHours === 0 && shifts.morningHours > 0) {
        // Night shift down only
        linePolishHalfDowntime.push({
          date: dateStr,
          type: 'line-polish-half',
          details: 'Night shift down'
        });
      }
    }

    const result = {
      multiCutter: {
        downtimeDays: multiCutterDowntime.length,
        dates: multiCutterDowntime
      },
      linePolish: {
        fullDowntimeDays: linePolishFullDowntime.length,
        halfDowntimeDays: linePolishHalfDowntime.length,
        fullDowntimeDates: linePolishFullDowntime,
        halfDowntimeDates: linePolishHalfDowntime
      },
      dateRange: {
        startDate,
        endDate,
        totalDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      }
    };

    console.log('[Downtime API] Results:', {
      multiCutterDowntime: result.multiCutter.downtimeDays,
      linePolishFull: result.linePolish.fullDowntimeDays,
      linePolishHalf: result.linePolish.halfDowntimeDays,
      totalDays: result.dateRange.totalDays
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Downtime API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
