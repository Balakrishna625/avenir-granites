import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Category matching helpers (same logic as sales analytics page)
const isSG       = (m: string) => /^s\/g/i.test(m) || /\bs\/g\b/i.test(m);
const isBP       = (m: string) => /^b\/p/i.test(m) || /\bb\/p\b/i.test(m);
const isBurgandy = (m: string) => /burgandy/i.test(m);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromMonth = searchParams.get('fromMonth');
    const fromYear  = searchParams.get('fromYear');
    const toMonth   = searchParams.get('toMonth');
    const toYear    = searchParams.get('toYear');

    let startDate: string;
    let endDate: string;

    if (fromMonth && fromYear && toMonth && toYear) {
      startDate = `${fromYear}-${fromMonth.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(toYear), parseInt(toMonth), 0).getDate();
      endDate = `${toYear}-${toMonth.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      startDate = `${month >= 4 ? year : year - 1}-04-01`;
      endDate   = `${month >= 4 ? year + 1 : year}-03-31`;
    }

    // Fetch sales with their items (only need sale_date and item details)
    const { data: sales, error } = await supabaseAdmin
      .from('sales')
      .select('sale_date, sale_items(material_name, square_feet, total_amount)')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    if (error) {
      console.error('Error fetching sales for category avg:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate ordered list of months in range
    const months: { key: string; label: string; month: number; year: number }[] = [];
    const cur = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 1);
    const endD = new Date(endDate);
    while (cur <= endD) {
      const mo = cur.getMonth() + 1;
      const yr = cur.getFullYear();
      months.push({
        key: `${yr}-${String(mo).padStart(2, '0')}`,
        label: cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        month: mo,
        year: yr,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    // Accumulate per-month category totals
    type CatBucket = { sqft: number; amount: number };
    const buckets: Record<string, { sg: CatBucket; bp: CatBucket; burgandy: CatBucket }> = {};
    for (const m of months) {
      buckets[m.key] = {
        sg:       { sqft: 0, amount: 0 },
        bp:       { sqft: 0, amount: 0 },
        burgandy: { sqft: 0, amount: 0 },
      };
    }

    for (const sale of sales || []) {
      const d = new Date(sale.sale_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) continue;

      for (const item of sale.sale_items || []) {
        const name = item.material_name || '';
        const sqft   = Number(item.square_feet)  || 0;
        const amount = Number(item.total_amount)  || 0;

        if      (isSG(name))       { buckets[key].sg.sqft += sqft;       buckets[key].sg.amount += amount; }
        else if (isBP(name))       { buckets[key].bp.sqft += sqft;       buckets[key].bp.amount += amount; }
        else if (isBurgandy(name)) { buckets[key].burgandy.sqft += sqft; buckets[key].burgandy.amount += amount; }
      }
    }

    const result = months.map(m => {
      const b = buckets[m.key];
      return {
        month:     m.label.split(' ')[0],         // "Oct"
        fullMonth: m.label,                        // "Oct 2025"
        sg:        b.sg.sqft       > 0 ? Math.round((b.sg.amount       / b.sg.sqft)       * 100) / 100 : null,
        bp:        b.bp.sqft       > 0 ? Math.round((b.bp.amount       / b.bp.sqft)       * 100) / 100 : null,
        burgandy:  b.burgandy.sqft > 0 ? Math.round((b.burgandy.amount / b.burgandy.sqft) * 100) / 100 : null,
        // raw totals for tooltip
        sgSqft:       Math.round(b.sg.sqft),
        bpSqft:       Math.round(b.bp.sqft),
        burgundySqft: Math.round(b.burgandy.sqft),
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in category-avg route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
