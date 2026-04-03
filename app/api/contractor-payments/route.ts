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

          const { data: prevData } = await supabaseAdmin
            .from('contractor_payments')
            .select('balance')
            .eq('contractor_name', name)
            .eq('month', prevMonth)
            .single();

          const carry_forward = prevData?.balance || 0;
          
          console.log(`Carry forward for ${name}: ₹${carry_forward} from ${prevMonth}`);

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
            throw insertError;
          }
          contractorData = newData;
        } else if (error) {
          throw error;
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

        console.log(`${name} - Month: ${month}, Carry Forward: ₹${contractorData?.carry_forward || 0}, Payable: ₹${contractorData?.total_payable || 0}, Paid: ₹${total_paid}, Balance: ₹${balance}`);

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
