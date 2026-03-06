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

    // Fetch sales with customer info — only regular customers
    const { data: salesData, error } = await supabaseAdmin
      .from('sales')
      .select(`
        sale_date,
        total_sqft,
        customer_id,
        customers!inner (
          id,
          name,
          customer_type
        )
      `)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .not('customer_id', 'is', null)
      .or('customer_type.eq.regular,customer_type.is.null', { foreignTable: 'customers' });

    if (error) {
      console.error('Error fetching customer sqft data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate list of months in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months: { key: string; label: string }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const m = cur.getMonth() + 1;
      const y = cur.getFullYear();
      const label = cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push({ key: `${y}-${String(m).padStart(2, '0')}`, label });
      cur.setMonth(cur.getMonth() + 1);
    }

    // Aggregate by customer × month
    const customerMap: Record<string, { id: string; name: string; monthlyData: Record<string, number>; total: number }> = {};

    for (const sale of salesData || []) {
      const customer = (sale as any).customers;
      if (!customer) continue;
      // Skip one-time customers (double-check in case filter wasn't applied)
      if (customer.customer_type === 'one-time') continue;
      const cid = customer.id as string;
      const cname = customer.name as string;
      const saleDate = new Date(sale.sale_date);
      const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      const sqft = Number(sale.total_sqft) || 0;

      if (!customerMap[cid]) {
        customerMap[cid] = { id: cid, name: cname, monthlyData: {}, total: 0 };
      }
      customerMap[cid].monthlyData[monthKey] = (customerMap[cid].monthlyData[monthKey] || 0) + sqft;
      customerMap[cid].total += sqft;
    }

    // Sort customers by total sqft descending
    const customers = Object.values(customerMap)
      .map(c => ({
        ...c,
        monthlyData: c.monthlyData,
        total: Number(c.total.toFixed(2))
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ months, customers });
  } catch (error: any) {
    console.error('Error in customer-sqft API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
