import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12'); // Last N months

    // Get all bills ordered by date
    const { data: bills, error } = await supabaseAdmin
      .from('electricity_bills')
      .select('*')
      .order('bill_date', { ascending: true })
      .limit(months);

    if (error) throw error;

    if (!bills || bills.length === 0) {
      return NextResponse.json({
        monthlyData: [],
        stats: {},
        trends: {},
        chartData: {}
      });
    }

    // Group by month and calculate comparisons
    const monthlyData = bills.map((bill, index) => {
      const prevBill = index > 0 ? bills[index - 1] : null;

      return {
        month: bill.bill_month,
        bill_date: bill.bill_date,
        bill_number: bill.bill_number,
        
        // Core metrics
        kwh_consumption: bill.kwh_consumption,
        total_cost: bill.total_amount_payable,
        demand_kva: bill.kva_demand,
        power_factor: bill.power_factor,
        cost_per_kwh: bill.cost_per_kwh,
        
        // Charge breakdown
        fixed_charges: bill.fixed_charges,
        variable_charges: bill.variable_charges,
        demand_charges: bill.demand_charges_amount,
        energy_charges: bill.energy_charges_amount,
        tod_charges: bill.tod_charges,
        
        // Arrears
        arrears: bill.arrears_total,
        
        // Month-over-month changes
        consumption_change: prevBill 
          ? ((bill.kwh_consumption - prevBill.kwh_consumption) / prevBill.kwh_consumption) * 100 
          : 0,
        cost_change: prevBill 
          ? ((bill.total_amount_payable - prevBill.total_amount_payable) / prevBill.total_amount_payable) * 100 
          : 0,
        pf_change: prevBill 
          ? ((bill.power_factor - prevBill.power_factor) / prevBill.power_factor) * 100 
          : 0,
        demand_change: prevBill 
          ? ((bill.kva_demand - prevBill.kva_demand) / prevBill.kva_demand) * 100 
          : 0,
      };
    });

    // Calculate overall statistics
    const stats = {
      total_months: bills.length,
      total_consumption: bills.reduce((sum, b) => sum + (b.kwh_consumption || 0), 0),
      total_cost: bills.reduce((sum, b) => sum + (b.total_amount_payable || 0), 0),
      avg_consumption: bills.length > 0 
        ? bills.reduce((sum, b) => sum + (b.kwh_consumption || 0), 0) / bills.length 
        : 0,
      avg_cost: bills.length > 0 
        ? bills.reduce((sum, b) => sum + (b.total_amount_payable || 0), 0) / bills.length 
        : 0,
      avg_power_factor: bills.length > 0 
        ? bills.reduce((sum, b) => sum + (b.power_factor || 0), 0) / bills.length 
        : 0,
      avg_demand: bills.length > 0 
        ? bills.reduce((sum, b) => sum + (b.kva_demand || 0), 0) / bills.length 
        : 0,
      peak_consumption: Math.max(...bills.map(b => b.kwh_consumption || 0), 0),
      lowest_consumption: Math.min(...bills.map(b => b.kwh_consumption || 0).filter(v => v > 0), 0),
      peak_demand: Math.max(...bills.map(b => b.kva_demand || 0), 0),
      best_power_factor: Math.max(...bills.map(b => b.power_factor || 0), 0),
      worst_power_factor: Math.min(...bills.map(b => b.power_factor || 0).filter(v => v > 0), 0),
      total_arrears: bills.length > 0 ? bills[bills.length - 1].arrears_total || 0 : 0,
    };

    // Identify trends
    const trends = {
      consumption_trend: calculateTrend(bills.map(b => b.kwh_consumption)),
      cost_trend: calculateTrend(bills.map(b => b.total_amount_payable)),
      pf_trend: calculateTrend(bills.map(b => b.power_factor)),
      demand_trend: calculateTrend(bills.map(b => b.kva_demand)),
    };

    // Month-wise breakdown for charts
    const chartData = {
      labels: monthlyData.map(d => d.month),
      consumption: monthlyData.map(d => d.kwh_consumption),
      cost: monthlyData.map(d => d.total_cost),
      powerFactor: monthlyData.map(d => d.power_factor),
      demand: monthlyData.map(d => d.demand_kva),
      costPerKwh: monthlyData.map(d => d.cost_per_kwh),
      fixedCharges: monthlyData.map(d => d.fixed_charges),
      variableCharges: monthlyData.map(d => d.variable_charges),
    };

    return NextResponse.json({
      monthlyData,
      stats,
      trends,
      chartData
    });
  } catch (error: any) {
    console.error('Error fetching electricity analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Helper function to calculate trend (increasing/decreasing/stable)
function calculateTrend(values: number[]): string {
  if (values.length < 2) return 'insufficient_data';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}
