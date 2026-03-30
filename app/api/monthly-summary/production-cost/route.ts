import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fromMonth = searchParams.get('fromMonth') || '10';
  const fromYear = searchParams.get('fromYear') || '2025';
  const toMonth = searchParams.get('toMonth');
  const toYear = searchParams.get('toYear');

  // Determine date range
  const now = new Date();
  const fromDate = new Date(parseInt(fromYear), parseInt(fromMonth) - 1, 1);
  const toDate = toMonth && toYear
    ? new Date(parseInt(toYear), parseInt(toMonth), 0) // Last day of toMonth
    : now;

  const startDate = fromDate.toISOString().split('T')[0];
  const endDate = toDate.toISOString().split('T')[0];

  try {
    // Fetch expenses with category information
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('date, amount, expense_categories(name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (expensesError) {
      console.error('[Production Cost API] Expenses error:', expensesError);
      return NextResponse.json({ error: expensesError.message }, { status: 500 });
    }

    // Fetch multi-cutter production data
    const { data: production, error: productionError } = await supabaseAdmin
      .from('multi_cutter_reports')
      .select('date, total_sqft')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (productionError) {
      console.error('[Production Cost API] Production error:', productionError);
      return NextResponse.json({ error: productionError.message }, { status: 500 });
    }

    // Fetch line polish hours data
    const { data: linePolishData, error: linePolishError } = await supabaseAdmin
      .from('line_polish_reports')
      .select('date, no_of_hours')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (linePolishError) {
      console.error('[Production Cost API] Line Polish error:', linePolishError);
      return NextResponse.json({ error: linePolishError.message }, { status: 500 });
    }

    // Generate list of months in range
    const months: { key: string; label: string }[] = [];
    const current = new Date(fromDate);
    while (current <= toDate) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const label = `${current.toLocaleString('default', { month: 'short' })} ${current.getFullYear()}`;
      months.push({ key, label });
      current.setMonth(current.getMonth() + 1);
    }

    // Separate excluded categories (cash-basis expenses to be replaced with accrual)
    const excludedCategories = [
      'raw material', 
      'gst challan', 
      'raw materials',
      'labor & wages',  // Exclude contractor cash payments
      'contractor payment',
      'employee salary',
    ];

    // Group data by month
    interface MonthBucket {
      totalExpenses: number;
      adjustedExpenses: number; // Expenses excluding Raw Material, GST Challan, and Contractor Payments
      totalSqft: number;
      totalHours: number; // Line polish hours
    }

    const buckets: Record<string, MonthBucket> = {};
    for (const m of months) {
      buckets[m.key] = {
        totalExpenses: 0,
        adjustedExpenses: 0,
        totalSqft: 0,
        totalHours: 0,
      };
    }

    // Accumulate expenses
    for (const expense of expenses || []) {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) continue;

      const amount = Number(expense.amount) || 0;
      buckets[key].totalExpenses += amount;

      // Check if category should be excluded
      const categoryName = (expense.expense_categories as any)?.name || '';
      const isExcluded = excludedCategories.some(exc => 
        categoryName.toLowerCase().includes(exc)
      );

      if (!isExcluded) {
        buckets[key].adjustedExpenses += amount;
      }
    }

    // Accumulate production
    for (const prod of production || []) {
      const d = new Date(prod.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) continue;

      buckets[key].totalSqft += Number(prod.total_sqft) || 0;
    }

    // Accumulate line polish hours
    for (const lp of linePolishData || []) {
      const d = new Date(lp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) continue;

      buckets[key].totalHours += Number(lp.no_of_hours) || 0;
    }

    // Calculate cost per SFT for each month
    const result = months.map(m => {
      const b = buckets[m.key];
      
      // Calculate accrued contractor costs
      // Dinesh (multi-cutter): ₹6 per SFT
      // LinePolish: ₹250 per hour
      const dineshCost = b.totalSqft * 6;
      const linePolishCost = b.totalHours * 250;
      const accruedContractorCost = dineshCost + linePolishCost;

      // Add accrued contractor costs to adjusted expenses
      const finalExpenses = b.adjustedExpenses + accruedContractorCost;
      
      const costPerSqft = b.totalSqft > 0 
        ? Math.round((finalExpenses / b.totalSqft) * 100) / 100 
        : null;

      return {
        month: m.label.split(' ')[0], // "Oct"
        fullMonth: m.label, // "Oct 2025"
        costPerSqft: costPerSqft,
        totalExpenses: Math.round(b.totalExpenses),
        adjustedExpenses: Math.round(finalExpenses),
        totalSqft: Math.round(b.totalSqft),
        totalHours: Math.round(b.totalHours * 10) / 10, // One decimal for hours
        accruedContractorCost: Math.round(accruedContractorCost),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Production Cost API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production cost data' },
      { status: 500 }
    );
  }
}
