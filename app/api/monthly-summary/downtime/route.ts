import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface DowntimeEntry {
  date: string;
  type: 'multi-cutter' | 'line-polish-full' | 'line-polish-half';
  details?: string;
}

interface MonthlyDowntimeData {
  month: string; // YYYY-MM
  fullMonth: string; // e.g., "Oct 2025"
  multiCutterDays: number;
  linePolishFullDays: number;
  linePolishHalfDays: number;
  linePolishTotalImpact: number; // full + (half * 0.5)
  multiCutterDates: DowntimeEntry[];
  linePolishFullDates: DowntimeEntry[];
  linePolishHalfDates: DowntimeEntry[];
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

    // Fetch multi-cutter reports with blocks (which contain notes)
    const { data: multiCutterData, error: mcError } = await supabaseAdmin
      .from('multi_cutter_reports')
      .select('date, total_sqft, machine, blocks')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (mcError) {
      console.error('[Downtime API] Multi-cutter error:', mcError);
      return NextResponse.json({ error: mcError.message }, { status: 500 });
    }

    // Fetch line-polish reports with remarks
    const { data: linePolishData, error: lpError } = await supabaseAdmin
      .from('line_polish_reports')
      .select('date, shift, no_of_hours, remarks')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (lpError) {
      console.error('[Downtime API] Line-polish error:', lpError);
      return NextResponse.json({ error: lpError.message }, { status: 500 });
    }

    // Process multi-cutter downtime (days with 0 production across all machines)
    const multiCutterByDate: Record<string, number> = {};
    const multiCutterNotesByDate: Record<string, string[]> = {};
    (multiCutterData || []).forEach(record => {
      const date = record.date;
      multiCutterByDate[date] = (multiCutterByDate[date] || 0) + (Number(record.total_sqft) || 0);
      
      // Extract notes from blocks JSONB array
      if (record.blocks && Array.isArray(record.blocks)) {
        const notes = record.blocks
          .map((block: any) => block.notes)
          .filter((note: string) => note && note.trim().length > 0);
        if (notes.length > 0) {
          if (!multiCutterNotesByDate[date]) {
            multiCutterNotesByDate[date] = [];
          }
          multiCutterNotesByDate[date].push(...notes);
        }
      }
    });

    // Process line-polish downtime
    const linePolishByDate: Record<string, { morningHours: number; nightHours: number; morningRemarks: string[]; nightRemarks: string[] }> = {};
    (linePolishData || []).forEach(record => {
      const date = record.date;
      const hours = Number(record.no_of_hours) || 0;
      if (!linePolishByDate[date]) {
        linePolishByDate[date] = { morningHours: 0, nightHours: 0, morningRemarks: [], nightRemarks: [] };
      }
      if (record.shift === 'MORNING') {
        linePolishByDate[date].morningHours += hours;
        if (record.remarks && record.remarks.trim().length > 0) {
          linePolishByDate[date].morningRemarks.push(record.remarks);
        }
      } else if (record.shift === 'NIGHT') {
        linePolishByDate[date].nightHours += hours;
        if (record.remarks && record.remarks.trim().length > 0) {
          linePolishByDate[date].nightRemarks.push(record.remarks);
        }
      }
    });

    // Group downtime by month
    const monthlyData: Record<string, MonthlyDowntimeData> = {};
    
    // Generate list of months in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const monthKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      const fullMonth = cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = {
        month: monthKey,
        fullMonth,
        multiCutterDays: 0,
        linePolishFullDays: 0,
        linePolishHalfDays: 0,
        linePolishTotalImpact: 0,
        multiCutterDates: [],
        linePolishFullDates: [],
        linePolishHalfDates: []
      };
      cur.setMonth(cur.getMonth() + 1);
    }

    // Check each date in range for downtime
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Skip future dates - only count downtime for dates that have already passed
      if (d > today) {
        continue;
      }
      
      // Multi-cutter downtime
      const totalSqft = multiCutterByDate[dateStr] || 0;
      if (totalSqft === 0) {
        const notes = multiCutterNotesByDate[dateStr] || [];
        const details = notes.length > 0 ? notes.join('; ') : 'No production (no notes recorded)';
        monthlyData[monthKey].multiCutterDays++;
        monthlyData[monthKey].multiCutterDates.push({
          date: dateStr,
          type: 'multi-cutter',
          details
        });
      }

      // Line-polish downtime
      const shifts = linePolishByDate[dateStr] || { morningHours: 0, nightHours: 0, morningRemarks: [], nightRemarks: [] };
      
      if (shifts.morningHours === 0 && shifts.nightHours === 0) {
        // Full day downtime
        const allRemarks = [...shifts.morningRemarks, ...shifts.nightRemarks];
        const details = allRemarks.length > 0 ? allRemarks.join('; ') : 'Both shifts down (no remarks recorded)';
        monthlyData[monthKey].linePolishFullDays++;
        monthlyData[monthKey].linePolishFullDates.push({
          date: dateStr,
          type: 'line-polish-full',
          details
        });
      } else if (shifts.morningHours === 0 && shifts.nightHours > 0) {
        // Morning shift down only
        const details = shifts.morningRemarks.length > 0 
          ? `Morning shift: ${shifts.morningRemarks.join('; ')}`
          : 'Morning shift down (no remarks recorded)';
        monthlyData[monthKey].linePolishHalfDays++;
        monthlyData[monthKey].linePolishHalfDates.push({
          date: dateStr,
          type: 'line-polish-half',
          details
        });
      } else if (shifts.nightHours === 0 && shifts.morningHours > 0) {
        // Night shift down only
        const details = shifts.nightRemarks.length > 0 
          ? `Night shift: ${shifts.nightRemarks.join('; ')}`
          : 'Night shift down (no remarks recorded)';
        monthlyData[monthKey].linePolishHalfDays++;
        monthlyData[monthKey].linePolishHalfDates.push({
          date: dateStr,
          type: 'line-polish-half',
          details
        });
      }
    }

    // Calculate total impact for each month
    Object.values(monthlyData).forEach(month => {
      month.linePolishTotalImpact = month.linePolishFullDays + (month.linePolishHalfDays * 0.5);
    });

    const result = {
      monthlyData: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
      summary: {
        totalMultiCutterDowntimeDays: Object.values(monthlyData).reduce((sum, m) => sum + m.multiCutterDays, 0),
        totalLinePolishFullDays: Object.values(monthlyData).reduce((sum, m) => sum + m.linePolishFullDays, 0),
        totalLinePolishHalfDays: Object.values(monthlyData).reduce((sum, m) => sum + m.linePolishHalfDays, 0),
        totalLinePolishImpact: Object.values(monthlyData).reduce((sum, m) => sum + m.linePolishTotalImpact, 0)
      },
      dateRange: {
        startDate,
        endDate,
        totalDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      }
    };

    console.log('[Downtime API] Results:', result.summary);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Downtime API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
