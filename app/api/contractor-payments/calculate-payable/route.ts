import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * AUTO-CALCULATE CONTRACTOR PAYABLES
 * 
 * This endpoint calculates payable amounts for contractors based on their work:
 * - Contractor Dinesh: Total SqFt sold × ₹6 per SqFt
 * - Contractor LinePolish: Total hours worked × ₹250 per hour
 * 
 * Only applies to months from March 2026 onwards.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { month, contractor_name } = body;

    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    // Parse month to check if >= March 2026
    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(year, monthNum - 1, 1);
    const marchCutoff = new Date(2026, 2, 1); // March 2026

    if (monthDate < marchCutoff) {
      return NextResponse.json({
        message: 'Auto-calculation only applies from March 2026 onwards',
        month,
        updated: false
      });
    }

    const results: any = {};

    // Calculate for Contractor Dinesh if requested or if no specific contractor
    if (!contractor_name || contractor_name === 'Contractor Dinesh') {
      const dineshPayable = await calculateDineshPayable(month);
      results.dinesh = dineshPayable;
      
      // Update in database
      await updateContractorPayable('Contractor Dinesh', month, dineshPayable.total_payable);
    }

    // Calculate for Contractor LinePolish if requested or if no specific contractor
    if (!contractor_name || contractor_name === 'Contractor LinePolish') {
      const linePolishPayable = await calculateLinePolishPayable(month);
      results.linePolish = linePolishPayable;
      
      // Update in database
      await updateContractorPayable('Contractor LinePolish', month, linePolishPayable.total_payable);
    }

    return NextResponse.json({
      month,
      updated: true,
      results
    });

  } catch (error: any) {
    console.error('Error calculating contractor payables:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Calculate Dinesh's payable: Total SqFt sold × ₹6
 */
async function calculateDineshPayable(month: string) {
  const [year, monthNum] = month.split('-');
  
  // Get all sales for this month
  const { data: sales, error } = await supabaseAdmin
    .from('sales')
    .select(`
      id,
      sale_date,
      total_sqft,
      sale_items (
        square_feet
      )
    `)
    .gte('sale_date', `${year}-${monthNum}-01`)
    .lt('sale_date', getNextMonthStart(year, monthNum))
    .order('sale_date', { ascending: true });

  if (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }

  // Calculate total square feet sold
  const total_sqft = sales?.reduce((sum, sale) => sum + (parseFloat(sale.total_sqft?.toString() || '0')), 0) || 0;
  
  // Rate: ₹6 per SqFt
  const rate_per_sqft = 6;
  const total_payable = total_sqft * rate_per_sqft;

  console.log(`📊 Dinesh Calculation for ${month}:`, {
    total_sales: sales?.length || 0,
    total_sqft,
    rate_per_sqft,
    total_payable
  });

  return {
    total_sqft,
    rate_per_sqft,
    total_payable,
    sales_count: sales?.length || 0
  };
}

/**
 * Calculate LinePolish's payable: Total hours worked × ₹250
 */
async function calculateLinePolishPayable(month: string) {
  const [year, monthNum] = month.split('-');
  
  // Get all line polish reports for this month
  const { data: reports, error } = await supabaseAdmin
    .from('line_polish_reports')
    .select('*')
    .gte('date', `${year}-${monthNum}-01`)
    .lt('date', getNextMonthStart(year, monthNum))
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching line polish reports:', error);
    throw error;
  }

  // Calculate total hours worked
  const total_hours = reports?.reduce((sum, report) => sum + (parseFloat(report.no_of_hours?.toString() || '0')), 0) || 0;
  
  // Rate: ₹250 per hour
  const rate_per_hour = 250;
  const total_payable = total_hours * rate_per_hour;

  console.log(`📊 LinePolish Calculation for ${month}:`, {
    total_reports: reports?.length || 0,
    total_hours,
    rate_per_hour,
    total_payable
  });

  return {
    total_hours,
    rate_per_hour,
    total_payable,
    reports_count: reports?.length || 0
  };
}

/**
 * Update or create contractor payment record with calculated payable
 */
async function updateContractorPayable(contractor_name: string, month: string, total_payable: number) {
  // First, try to get existing record
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('contractor_payments')
    .select('*')
    .eq('contractor_name', contractor_name)
    .eq('month', month)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabaseAdmin
      .from('contractor_payments')
      .update({ 
        total_payable,
        balance: (existing.carry_forward || 0) + total_payable - (existing.total_paid || 0)
      })
      .eq('id', existing.id);

    if (updateError) throw updateError;
    
    console.log(`✅ Updated ${contractor_name} payable: ₹${total_payable}`);
  } else {
    // Create new record with carry forward calculation
    const [year, monthNum] = month.split('-').map(Number);
    const prevDate = new Date(year, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const { data: prevData } = await supabaseAdmin
      .from('contractor_payments')
      .select('balance')
      .eq('contractor_name', contractor_name)
      .eq('month', prevMonth)
      .single();

    const carry_forward = prevData?.balance || 0;

    const { error: insertError } = await supabaseAdmin
      .from('contractor_payments')
      .insert({
        contractor_name,
        month,
        total_payable,
        carry_forward,
        balance: carry_forward + total_payable
      });

    if (insertError) throw insertError;
    
    console.log(`✅ Created ${contractor_name} record with payable: ₹${total_payable}`);
  }
}

/**
 * Get the start date of next month in YYYY-MM-DD format
 */
function getNextMonthStart(year: string, month: string): string {
  const nextMonth = new Date(parseInt(year), parseInt(month), 1);
  return nextMonth.toISOString().split('T')[0];
}
