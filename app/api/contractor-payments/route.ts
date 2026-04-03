import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch contractor payment data for a specific month
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
    }

    // Auto-calculate payables for months >= April 2026
    await autoCalculatePayables(month);

    // Fetch data for both contractors
    const contractorNames = ['Contractor Dinesh', 'Contractor LinePolish'];
    
    const results = await Promise.all(
      contractorNames.map(async (name) => {
        // Get or create contractor payment record for this month
        let { data: contractorData, error } = await supabaseAdmin
          .from('contractor_payments')
          .select('*')
          .eq('contractor_name', name)
          .eq('month', month)
          .single();

        if (error && error.code === 'PGRST116') {
          // Record doesn't exist, calculate carry forward from previous month
          const [year, monthNum] = month.split('-').map(Number);
          const prevDate = new Date(year, monthNum - 2, 1);
          const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

          console.log(`Creating new record for ${name} in ${month}, checking previous month: ${prevMonth}`);

          const { data: prevData, error: prevError } = await supabaseAdmin
            .from('contractor_payments')
            .select('*')
            .eq('contractor_name', name)
            .eq('month', prevMonth)
            .single();

          if (prevError) {
            console.log(`No previous month data found for ${name} in ${prevMonth}:`, prevError.message);
          } else {
            console.log(`Previous month data for ${name}:`, prevData);
          }

          const carry_forward = prevData?.balance || 0;
          
          console.log(`✓ Carry forward for ${name}: ₹${carry_forward} from ${prevMonth}`);

          // Create new record with carry forward
          const { data: newData, error: insertError } = await supabaseAdmin
            .from('contractor_payments')
            .insert({
              contractor_name: name,
              month: month,
              total_payable: 0,
              carry_forward: carry_forward,
              balance: carry_forward // Initial balance = carry forward
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Failed to create record for ${name}:`, insertError);
            throw insertError;
          }
          
          console.log(`✓ Created new record for ${name}:`, newData);
          contractorData = newData;
        } else if (error) {
          console.error(`Error fetching contractor data for ${name}:`, error);
          throw error;
        } else {
          console.log(`✓ Found existing record for ${name} in ${month}:`, contractorData);
        }

        // ALWAYS check and update carry forward from previous month
        const [year, monthNum] = month.split('-').map(Number);
        const prevDate = new Date(year, monthNum - 2, 1);
        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        const { data: prevData } = await supabaseAdmin
          .from('contractor_payments')
          .select('balance')
          .eq('contractor_name', name)
          .eq('month', prevMonth)
          .single();

        const correct_carry_forward = prevData?.balance || 0;

        // Update carry forward if it's different from previous month's balance
        if (contractorData && contractorData.carry_forward !== correct_carry_forward) {
          await supabaseAdmin
            .from('contractor_payments')
            .update({ carry_forward: correct_carry_forward })
            .eq('id', contractorData.id);
          
          contractorData.carry_forward = correct_carry_forward;
        }

        // Get transactions for this month
        const { data: transactions, error: txnError } = await supabaseAdmin
          .from('contractor_payment_transactions')
          .select('*')
          .eq('contractor_payment_id', contractorData?.id)
          .order('payment_date', { ascending: false });

        if (txnError) throw txnError;

        // Calculate totals
        const total_paid = transactions?.reduce((sum, txn) => sum + parseFloat(txn.amount.toString()), 0) || 0;
        const balance = (contractorData?.carry_forward || 0) + (contractorData?.total_payable || 0) - total_paid;

        // Update balance in database
        await supabaseAdmin
          .from('contractor_payments')
          .update({ balance })
          .eq('id', contractorData?.id);

        return {
          data: { ...contractorData, total_paid, balance },
          transactions: transactions || []
        };
      })
    );

    return NextResponse.json({
      dinesh: results[0].data,
      dineshTransactions: results[0].transactions,
      linePolish: results[1].data,
      linePolishTransactions: results[1].transactions
    });
  } catch (error: any) {
    console.error('Error fetching contractor payments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Auto-calculate contractor payables for months >= April 2026
 * - Contractor Dinesh: Total SqFt sold × ₹6
 * - Contractor LinePolish: Total hours worked × ₹250
 */
async function autoCalculatePayables(month: string) {
  try {
    // Parse month to check if >= April 2026
    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(year, monthNum - 1, 1);
    const aprilCutoff = new Date(2026, 3, 1); // April 2026

    if (monthDate < aprilCutoff) {
      console.log(`⏭️ Skipping auto-calculation for ${month} (before April 2026)`);
      return;
    }

    console.log(`🔄 Auto-calculating payables for ${month}...`);

    // Calculate Dinesh's payable
    const dineshPayable = await calculateDineshPayable(month);
    await updateContractorPayable('Contractor Dinesh', month, dineshPayable.total_payable);

    // Calculate LinePolish's payable
    const linePolishPayable = await calculateLinePolishPayable(month);
    await updateContractorPayable('Contractor LinePolish', month, linePolishPayable.total_payable);

    console.log(`✅ Auto-calculation complete for ${month}`);
  } catch (error) {
    console.error('Error in auto-calculate:', error);
    // Don't throw - continue with normal flow even if auto-calc fails
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
      total_sqft
    `)
    .gte('sale_date', `${year}-${monthNum.padStart(2, '0')}-01`)
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

  console.log(`  💰 Dinesh: ${total_sqft} sqft × ₹${rate_per_sqft} = ₹${total_payable} (${sales?.length || 0} sales)`);

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
    .gte('date', `${year}-${monthNum.padStart(2, '0')}-01`)
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

  console.log(`  ⏱️ LinePolish: ${total_hours} hrs × ₹${rate_per_hour} = ₹${total_payable} (${reports?.length || 0} reports)`);

  return {
    total_hours,
    rate_per_hour,
    total_payable,
    reports_count: reports?.length || 0
  };
}

/**
 * Update or create contractor payment record with calculated payable
 * Only updates if the record was not manually adjusted
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
    // Check if manually adjusted - if so, skip auto-update
    if (existing.manually_adjusted) {
      console.log(`  ⏭️ ${contractor_name}: Manually adjusted, skipping auto-update`);
      return;
    }
    
    // Only update if payable has changed
    if (existing.total_payable !== total_payable) {
      const { data: transactions } = await supabaseAdmin
        .from('contractor_payment_transactions')
        .select('amount')
        .eq('contractor_payment_id', existing.id);

      const total_paid = transactions?.reduce((sum, txn) => sum + parseFloat(txn.amount.toString()), 0) || 0;

      const { error: updateError } = await supabaseAdmin
        .from('contractor_payments')
        .update({ 
          total_payable,
          balance: (existing.carry_forward || 0) + total_payable - total_paid
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      
      console.log(`  ✅ Updated ${contractor_name}: ₹${existing.total_payable} → ₹${total_payable}`);
    } else {
      console.log(`  ⏭️ ${contractor_name}: No change (₹${total_payable})`);
    }
  }
  // Note: If record doesn't exist, it will be created by the normal flow
}

/**
 * Get the start date of next month in YYYY-MM-DD format
 */
function getNextMonthStart(year: string, month: string): string {
  const nextMonth = new Date(parseInt(year), parseInt(month), 1);
  return nextMonth.toISOString().split('T')[0];
}
