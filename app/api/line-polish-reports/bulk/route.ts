import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reports, entries } = body;

    // Support both 'reports' (old) and 'entries' (new) parameter names
    const dataToInsert = entries || reports;

    if (!dataToInsert || !Array.isArray(dataToInsert) || dataToInsert.length === 0) {
      return NextResponse.json({ error: 'Entries array is required and must not be empty' }, { status: 400 });
    }

    // Validate each entry
    const validatedEntries = dataToInsert.map((entry: any) => {
      if (!entry.date || !entry.shift || !entry.activity) {
        throw new Error('Missing required fields: date, shift, or activity');
      }

      return {
        date: entry.date,
        shift: entry.shift,
        activity: entry.activity,
        no_of_workers: parseInt(entry.no_of_workers) || 3,
        number_of_slabs: parseInt(entry.number_of_slabs) || 0,
        total_sqft: parseFloat(entry.total_sqft) || 0,
        no_of_hours: parseFloat(entry.no_of_hours) || 0,
        rate_per_hour: parseFloat(entry.rate_per_hour) || 250,
        debit_amount: parseFloat(entry.debit_amount) || 0,
        remarks: entry.remarks || null,
        entry_group_id: entry.entry_group_id || null, // Support grouped entries
      };
    });

    // Insert all entries in bulk
    const { data, error } = await supabase
      .from('line_polish_reports')
      .insert(validatedEntries)
      .select();

    if (error) {
      console.error('Error inserting entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique months from inserted entries
    const months = new Set<string>();
    validatedEntries.forEach(entry => {
      const month = entry.date.slice(0, 7);
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
